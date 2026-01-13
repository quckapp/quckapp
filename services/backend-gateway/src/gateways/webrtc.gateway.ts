import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { MessagesService } from '../modules/messages/messages.service';
import { CallsService } from '../modules/calls/calls.service';
import { LoggerService } from '../common/logger/logger.service';
import { randomBytes } from 'crypto';

interface CallSession {
  callId: string;
  dbCallId?: string; // MongoDB document ID for persisting call history
  conversationId: string;
  initiator: string;
  participants: string[];
  callType: 'audio' | 'video';
  startTime: Date;
  status: 'ringing' | 'active' | 'ended';
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/webrtc',
  transports: ['websocket'],
  pingTimeout: 30000,
  pingInterval: 10000,
  allowEIO3: true,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: false,
})
export class WebrtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private static readonly CONTEXT = 'WebrtcGateway';

  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private activeCalls: Map<string, CallSession> = new Map(); // callId -> CallSession

  constructor(
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private messagesService: MessagesService,
    @Inject(forwardRef(() => CallsService))
    private callsService: CallsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;
      this.connectedUsers.set(userId, client.id);

      this.logger.log(`User ${userId} connected to WebRTC`, WebrtcGateway.CONTEXT);

      // Check for pending incoming calls for this user
      this.activeCalls.forEach(async (call, callId) => {
        // Skip if user is the initiator (they started the call)
        if (call.initiator === userId) return;

        // Check if user is a participant in an active ringing call
        if (call.participants.includes(userId) && call.status === 'ringing') {
          this.logger.log(
            `Sending pending call ${callId} to reconnected user ${userId}`,
            WebrtcGateway.CONTEXT,
          );

          // Get caller info
          const caller = await this.usersService.findById(call.initiator);

          // Send the incoming call event
          client.emit('call:incoming', {
            callId,
            callType: call.callType,
            conversationId: call.conversationId,
            from: {
              id: call.initiator,
              displayName: caller?.displayName || 'Unknown',
              avatar: caller?.avatar,
            },
          });
        }
      });
    } catch (error) {
      this.logger.error('WebRTC connection error', error.message, WebrtcGateway.CONTEXT);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      this.connectedUsers.delete(userId);

      // Don't immediately end calls on disconnect - the user might reconnect
      // Only end calls that are already active (connected), not ringing ones
      // This prevents race conditions where caller disconnects briefly during call setup
      this.activeCalls.forEach((call, callId) => {
        if (call.participants.includes(userId)) {
          // Only auto-end if the call was active (both parties connected)
          // and the disconnecting user is the only remaining participant
          if (call.status === 'active') {
            const otherParticipants = call.participants.filter(p => p !== userId);
            const anyOtherConnected = otherParticipants.some(p => this.connectedUsers.has(p));

            if (!anyOtherConnected) {
              // No other participants connected, end the call
              this.logger.log(
                `User ${userId} disconnected from active call ${callId} with no other participants - ending call`,
                WebrtcGateway.CONTEXT,
              );
              this.handleCallEnd(client, { callId });
            } else {
              this.logger.log(
                `User ${userId} disconnected from call ${callId} but other participants still connected`,
                WebrtcGateway.CONTEXT,
              );
            }
          } else {
            // Call is still ringing - don't end it, let the receiver have a chance to answer
            // or let it timeout naturally
            this.logger.log(
              `User ${userId} disconnected while call ${callId} is ${call.status} - not ending call yet`,
              WebrtcGateway.CONTEXT,
            );
          }
        }
      });

      this.logger.log(`User ${userId} disconnected from WebRTC`, WebrtcGateway.CONTEXT);
    }
  }

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      participants: string[];
      callType: 'audio' | 'video';
    },
  ) {
    try {
      const userId = client.data.userId;
      this.logger.log(
        `Call initiate request from user ${userId}, conversationId: ${data.conversationId}, participants: ${JSON.stringify(data.participants)}`,
        WebrtcGateway.CONTEXT,
      );

      const callId = `call_${Date.now()}_${randomBytes(6).toString('hex')}`;

      const callSession: CallSession = {
        callId,
        conversationId: data.conversationId,
        initiator: userId,
        participants: [userId, ...data.participants],
        callType: data.callType,
        startTime: new Date(),
        status: 'ringing',
      };

      // Save call to database for history
      try {
        const dbCall = await this.callsService.create(userId, {
          conversationId: data.conversationId,
          type: data.callType,
          participantIds: data.participants,
        });
        callSession.dbCallId = (dbCall as any)._id.toString();
        this.logger.log(`Call saved to database with ID: ${callSession.dbCallId}`, WebrtcGateway.CONTEXT);
      } catch (dbError) {
        this.logger.error('Failed to save call to database', dbError.message, WebrtcGateway.CONTEXT);
      }

      this.activeCalls.set(callId, callSession);

      this.logger.log(`Finding caller with userId: ${userId}`, WebrtcGateway.CONTEXT);
      const caller = await this.usersService.findById(userId);

      // Process participants - send both socket event AND push notification for calls
      // Push notification is needed to wake up the app when in background (CallKeep)
      for (const participantId of data.participants) {
        this.logger.log(`Processing participant: ${participantId}`, WebrtcGateway.CONTEXT);
        const socketId = this.connectedUsers.get(participantId);

        // Always send socket event if connected
        if (socketId) {
          this.logger.log(
            `Participant ${participantId} is online, sending call:incoming event`,
            WebrtcGateway.CONTEXT,
          );
          this.server.to(socketId).emit('call:incoming', {
            callId,
            callType: data.callType,
            conversationId: data.conversationId,
            from: {
              id: userId,
              displayName: caller.displayName,
              avatar: caller.avatar,
            },
          });
        }
      }

      // Always send push notifications to ALL participants (for CallKeep to wake up the app)
      // This ensures incoming calls work even when app is in background/killed
      // IMPORTANT: We await this to ensure notifications are sent before returning
      this.logger.log(
        `Fetching ${data.participants.length} participants for push notifications`,
        WebrtcGateway.CONTEXT,
      );

      try {
        const participants = await this.usersService.getUsersByIds(data.participants);

        // Send push notifications in parallel but wait for all to complete
        const notificationPromises = participants.map(async (participant) => {
          if (participant.fcmTokens && participant.fcmTokens.length > 0) {
            this.logger.log(
              `Sending push notification to participant ${participant._id}`,
              WebrtcGateway.CONTEXT,
            );
            try {
              await this.notificationsService.sendCallNotification(
                participant.fcmTokens,
                caller.displayName,
                data.callType,
                data.conversationId,
                callId,
              );
              this.logger.log(
                `Push notification sent successfully to ${participant._id}`,
                WebrtcGateway.CONTEXT,
              );
            } catch (err) {
              this.logger.error(
                `Error sending call notification to ${participant._id}`,
                err.message,
                WebrtcGateway.CONTEXT,
              );
            }
          } else {
            this.logger.warn(
              `Participant ${participant._id} has no FCM tokens`,
              WebrtcGateway.CONTEXT,
            );
          }
        });

        await Promise.all(notificationPromises);
        this.logger.log('All push notifications sent for call', WebrtcGateway.CONTEXT);
      } catch (err) {
        this.logger.error('Error fetching participants for push', err.message, WebrtcGateway.CONTEXT);
      }

      client.join(`call:${callId}`);

      return {
        success: true,
        callId,
        iceServers: this.getIceServers(),
      };
    } catch (error) {
      this.logger.error('Error initiating call', error.stack || error.message, WebrtcGateway.CONTEXT);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    try {
      const userId = client.data.userId;
      let call = this.activeCalls.get(data.callId);

      if (!call) {
        // Call not found in memory - this can happen if:
        // 1. Server restarted between call initiation and answer
        // 2. Caller's socket briefly disconnected
        // 3. Race condition where call was cleaned up
        this.logger.warn(
          `Call ${data.callId} not found in activeCalls. This may be a timing issue.`,
          WebrtcGateway.CONTEXT,
        );

        // Try to recover by creating a minimal call session
        // The call should still exist in the database
        // We need the conversationId from the client to reconstruct
        this.logger.log(
          `Attempting to allow answer for call ${data.callId} despite missing from activeCalls`,
          WebrtcGateway.CONTEXT,
        );

        // Create a minimal call session to allow the call to proceed
        // The initiator might reconnect and the call can continue
        call = {
          callId: data.callId,
          conversationId: '', // Will be filled by client context
          initiator: '', // Unknown at this point
          participants: [userId],
          callType: 'audio', // Default, will be overridden by signaling
          startTime: new Date(),
          status: 'active',
        };
        this.activeCalls.set(data.callId, call);
      }

      client.join(`call:${data.callId}`);

      this.server.to(`call:${data.callId}`).emit('call:participant:joined', {
        callId: data.callId,
        userId,
      });

      call.status = 'active';

      // Update participant joined status in database
      if (call.dbCallId) {
        try {
          const joinedCall = await this.callsService.joinCall(call.dbCallId, userId);
          if (joinedCall) {
            this.logger.log(`User ${userId} joined call ${call.dbCallId} in database`, WebrtcGateway.CONTEXT);
          }
        } catch (dbError) {
          this.logger.error('Failed to update call join in database', dbError.message, WebrtcGateway.CONTEXT);
        }
      }

      return {
        success: true,
        callId: data.callId,
        iceServers: this.getIceServers(),
        participants: call.participants,
      };
    } catch (error) {
      this.logger.error('Error answering call', error.message, WebrtcGateway.CONTEXT);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    try {
      const userId = client.data.userId;
      const call = this.activeCalls.get(data.callId);

      if (!call) {
        return { success: false, error: 'Call not found' };
      }

      this.logger.log(`Call ${data.callId} rejected by user ${userId}`, WebrtcGateway.CONTEXT);

      // Update call status in database (this also creates the call end message)
      if (call.dbCallId) {
        try {
          const updatedCall = await this.callsService.update(call.dbCallId, { status: 'rejected' });
          if (updatedCall) {
            this.logger.log(`Call ${call.dbCallId} status updated to rejected in database`, WebrtcGateway.CONTEXT);
          }
        } catch (dbError) {
          this.logger.error('Failed to update call status in database', dbError.message, WebrtcGateway.CONTEXT);
        }
      }

      // Emit to ALL participants including the rejector
      this.server.to(`call:${data.callId}`).emit('call:rejected', {
        callId: data.callId,
        userId,
      });

      // Also emit to the rejector's socket directly
      client.emit('call:rejected', {
        callId: data.callId,
        userId,
      });

      // Remove call from active calls
      this.activeCalls.delete(data.callId);

      return { success: true };
    } catch (error) {
      this.logger.error('Error rejecting call', error.message, WebrtcGateway.CONTEXT);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(@ConnectedSocket() client: Socket, @MessageBody() data: { callId: string }) {
    try {
      const userId = client.data.userId;
      const call = this.activeCalls.get(data.callId);

      if (!call) {
        return { success: false, error: 'Call not found' };
      }

      this.logger.log(`Call ${data.callId} ended by user ${userId}`, WebrtcGateway.CONTEXT);

      // Calculate call duration
      const duration = Math.floor((Date.now() - call.startTime.getTime()) / 1000);

      // Determine call status - if call was still ringing (not answered), it's missed
      // If caller ends while ringing, it's missed for the receiver
      const callStatus = call.status === 'ringing' ? 'missed' : 'completed';

      // Update call status in database (this also creates the call end message)
      if (call.dbCallId) {
        try {
          const updatedCall = await this.callsService.update(call.dbCallId, {
            status: callStatus,
            duration: callStatus === 'completed' ? duration : 0
          });
          if (updatedCall) {
            this.logger.log(`Call ${call.dbCallId} status updated to ${callStatus} in database`, WebrtcGateway.CONTEXT);
          }
        } catch (dbError) {
          this.logger.error('Failed to update call status in database', dbError.message, WebrtcGateway.CONTEXT);
        }
      }

      // Emit to ALL participants in the call room
      this.server.to(`call:${data.callId}`).emit('call:ended', {
        callId: data.callId,
        endedBy: userId,
      });

      // Also emit directly to all participants who may not have joined the room yet
      for (const participantId of call.participants) {
        if (participantId !== userId) {
          const socketId = this.connectedUsers.get(participantId);
          if (socketId) {
            this.server.to(socketId).emit('call:ended', {
              callId: data.callId,
              endedBy: userId,
            });
            this.logger.log(`Sent call:ended to participant ${participantId}`, WebrtcGateway.CONTEXT);
          }
        }
      }

      // Also emit to the caller's socket directly to ensure they get it
      client.emit('call:ended', {
        callId: data.callId,
        endedBy: userId,
      });

      // Remove call from active calls
      this.activeCalls.delete(data.callId);

      this.logger.log(`Call ${data.callId} removed from active calls`, WebrtcGateway.CONTEXT);

      return { success: true };
    } catch (error) {
      this.logger.error('Error ending call', error.message, WebrtcGateway.CONTEXT);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('webrtc:offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      callId: string;
      targetUserId: string;
      offer: RTCSessionDescriptionInit;
    },
  ) {
    try {
      const userId = client.data.userId;
      const targetSocketId = this.connectedUsers.get(data.targetUserId);

      if (targetSocketId) {
        this.server.to(targetSocketId).emit('webrtc:offer', {
          callId: data.callId,
          from: userId,
          offer: data.offer,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error sending offer', error.message, WebrtcGateway.CONTEXT);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('webrtc:answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      callId: string;
      targetUserId: string;
      answer: RTCSessionDescriptionInit;
    },
  ) {
    try {
      const userId = client.data.userId;
      const targetSocketId = this.connectedUsers.get(data.targetUserId);

      if (targetSocketId) {
        this.server.to(targetSocketId).emit('webrtc:answer', {
          callId: data.callId,
          from: userId,
          answer: data.answer,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error sending answer', error.message, WebrtcGateway.CONTEXT);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('webrtc:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      callId: string;
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    },
  ) {
    try {
      const userId = client.data.userId;
      const targetSocketId = this.connectedUsers.get(data.targetUserId);

      if (targetSocketId) {
        this.server.to(targetSocketId).emit('webrtc:ice-candidate', {
          callId: data.callId,
          from: userId,
          candidate: data.candidate,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error sending ICE candidate', error.message, WebrtcGateway.CONTEXT);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:toggle-audio')
  async handleToggleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; enabled: boolean },
  ) {
    const userId = client.data.userId;
    client.to(`call:${data.callId}`).emit('call:participant:audio-toggled', {
      userId,
      enabled: data.enabled,
    });
    return { success: true };
  }

  @SubscribeMessage('call:toggle-video')
  async handleToggleVideo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; enabled: boolean },
  ) {
    const userId = client.data.userId;
    client.to(`call:${data.callId}`).emit('call:participant:video-toggled', {
      userId,
      enabled: data.enabled,
    });
    return { success: true };
  }

  private getIceServers(): RTCIceServer[] {
    const stunServer = this.configService.get('STUN_SERVER_URL') || 'stun:stun.l.google.com:19302';
    const turnServer = this.configService.get('TURN_SERVER_URL');
    const turnUsername = this.configService.get('TURN_USERNAME');
    const turnCredential = this.configService.get('TURN_CREDENTIAL');

    const iceServers: RTCIceServer[] = [{ urls: stunServer }];

    if (turnServer && turnUsername && turnCredential) {
      iceServers.push({
        urls: turnServer,
        username: turnUsername,
        credential: turnCredential,
      });
    }

    return iceServers;
  }

  /**
   * Send call invitation to specific users
   * Called from the controller when users are invited to an active call
   */
  sendCallInvitation(
    userIds: string[],
    inviter: { id: string; displayName: string; avatar?: string },
    callData: { callId: string; callType: 'audio' | 'video'; conversationId: string },
  ): void {
    userIds.forEach((userId) => {
      const socketId = this.connectedUsers.get(userId);
      if (socketId) {
        this.server.to(socketId).emit('call:incoming', {
          callId: callData.callId,
          callType: callData.callType,
          conversationId: callData.conversationId,
          from: inviter,
          isInvite: true, // Flag to differentiate from initial call
        });
        this.logger.log(
          `Sent call invitation to user ${userId} for call ${callData.callId}`,
          WebrtcGateway.CONTEXT,
        );
      }
    });

    // Also add invited users to the active call session
    const call = this.activeCalls.get(callData.callId);
    if (call) {
      userIds.forEach((userId) => {
        if (!call.participants.includes(userId)) {
          call.participants.push(userId);
        }
      });
    }
  }
}

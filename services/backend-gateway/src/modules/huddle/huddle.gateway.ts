/**
 * Huddle Gateway - WebRTC Signaling via Socket.IO
 * SOLID: Single Responsibility - only handles WebRTC signaling
 * Pattern: Observer Pattern (pub/sub via Socket.IO)
 * Algorithm: O(1) event emission with room-based broadcasting
 */

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
import { HuddleFactory } from './factories/huddle.factory';

/**
 * WebRTC Signaling Events:
 * - join-room: Join a huddle room
 * - leave-room: Leave a huddle room
 * - webrtc-offer: Send WebRTC offer to peer
 * - webrtc-answer: Send WebRTC answer to peer
 * - ice-candidate: Send ICE candidate to peer
 * - participant-joined: Notify room of new participant
 * - participant-left: Notify room participant left
 * - toggle-audio: Notify audio state change
 * - toggle-video: Notify video state change
 */

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/huddle',
  transports: ['websocket'],
  pingTimeout: 30000,
  pingInterval: 10000,
  allowEIO3: true,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: false,
})
export class HuddleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track user -> socket mapping
  private userSockets = new Map<string, Socket>();
  // Track socket -> room mapping
  private socketRooms = new Map<string, string>();

  constructor(
    private readonly factory: HuddleFactory,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle client connection
   * Algorithm: O(1) - Map insertion
   */
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
      this.userSockets.set(userId, client);

      console.log(`User ${userId} connected to huddle gateway`);
    } catch (error) {
      console.error('Huddle connection error:', error.message);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   * Algorithm: O(1) - Map deletion + room leave
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const roomId = this.socketRooms.get(client.id);

    if (userId) {
      this.userSockets.delete(userId);
    }

    if (roomId) {
      // Notify room that user disconnected
      client.to(roomId).emit('participant-left', {
        userId,
        timestamp: new Date(),
      });
      this.socketRooms.delete(client.id);
    }

    console.log(`User ${userId} disconnected from huddle gateway`);
  }

  /**
   * Join a huddle room
   * Algorithm: O(1) - room join operation
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const { roomId } = data;

    // Leave previous room if any
    const previousRoom = this.socketRooms.get(client.id);
    if (previousRoom) {
      client.leave(previousRoom);
      client.to(previousRoom).emit('participant-left', { userId });
    }

    // Join new room
    await client.join(roomId);
    this.socketRooms.set(client.id, roomId);

    // Notify room of new participant
    client.to(roomId).emit('participant-joined', {
      userId,
      timestamp: new Date(),
    });

    // Send confirmation
    client.emit('room-joined', { roomId, userId });

    console.log(`User ${userId} joined room ${roomId}`);
  }

  /**
   * Leave a huddle room
   * Algorithm: O(1) - room leave operation
   */
  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const { roomId } = data;

    await client.leave(roomId);
    this.socketRooms.delete(client.id);

    // Notify room
    client.to(roomId).emit('participant-left', {
      userId,
      timestamp: new Date(),
    });

    client.emit('room-left', { roomId });

    console.log(`User ${userId} left room ${roomId}`);
  }

  /**
   * Forward WebRTC offer to specific peer
   * Algorithm: O(1) - direct socket emission
   */
  @SubscribeMessage('webrtc-offer')
  async handleWebRTCOffer(
    @MessageBody() data: { to: string; offer: any; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const from = client.data.userId;
    const { to, offer, roomId } = data;

    const offerData = this.factory.createOfferData(from, to, offer);

    // Send to specific user
    const targetSocket = this.userSockets.get(to);
    if (targetSocket) {
      targetSocket.emit('webrtc-offer', offerData);
      console.log(`Forwarded offer from ${from} to ${to} in room ${roomId}`);
    }
  }

  /**
   * Forward WebRTC answer to specific peer
   * Algorithm: O(1) - direct socket emission
   */
  @SubscribeMessage('webrtc-answer')
  async handleWebRTCAnswer(
    @MessageBody() data: { to: string; answer: any; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const from = client.data.userId;
    const { to, answer, roomId } = data;

    const answerData = this.factory.createAnswerData(from, to, answer);

    // Send to specific user
    const targetSocket = this.userSockets.get(to);
    if (targetSocket) {
      targetSocket.emit('webrtc-answer', answerData);
      console.log(`Forwarded answer from ${from} to ${to} in room ${roomId}`);
    }
  }

  /**
   * Forward ICE candidate to specific peer
   * Algorithm: O(1) - direct socket emission
   */
  @SubscribeMessage('ice-candidate')
  async handleICECandidate(
    @MessageBody() data: { to: string; candidate: any; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const from = client.data.userId;
    const { to, candidate, roomId } = data;

    const candidateData = this.factory.createIceCandidateData(from, to, candidate);

    // Send to specific user
    const targetSocket = this.userSockets.get(to);
    if (targetSocket) {
      targetSocket.emit('ice-candidate', candidateData);
    }
  }

  /**
   * Broadcast audio toggle to room
   * Algorithm: O(n) where n = participants in room
   */
  @SubscribeMessage('toggle-audio')
  async handleToggleAudio(
    @MessageBody() data: { roomId: string; enabled: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const { roomId, enabled } = data;

    client.to(roomId).emit('participant-audio-toggled', {
      userId,
      enabled,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast video toggle to room
   * Algorithm: O(n) where n = participants in room
   */
  @SubscribeMessage('toggle-video')
  async handleToggleVideo(
    @MessageBody() data: { roomId: string; enabled: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const { roomId, enabled } = data;

    client.to(roomId).emit('participant-video-toggled', {
      userId,
      enabled,
      timestamp: new Date(),
    });
  }

  /**
   * Get room participants
   * Algorithm: O(1) - Map lookup
   */
  @SubscribeMessage('get-participants')
  async handleGetParticipants(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;

    // Get all sockets in the room
    const room = this.server.sockets.adapter.rooms.get(roomId);
    if (!room) {
      client.emit('participants-list', { participants: [] });
      return;
    }

    const participants = Array.from(room).map((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId);
      return {
        userId: socket?.data?.userId,
        socketId,
      };
    });

    client.emit('participants-list', { participants });
  }

  /**
   * Send huddle invitation to specific users
   * Called from the controller when users are invited
   * Algorithm: O(n) where n = invited users
   */
  sendHuddleInvitation(
    userIds: string[],
    inviterUserId: string,
    huddle: { roomId: string; type: string; chatId?: string },
  ): void {
    userIds.forEach((userId) => {
      const socket = this.userSockets.get(userId);
      if (socket) {
        socket.emit('huddle-invitation', {
          roomId: huddle.roomId,
          type: huddle.type,
          chatId: huddle.chatId,
          inviterId: inviterUserId,
          timestamp: new Date(),
        });
        console.log(`Sent huddle invitation to user ${userId} for room ${huddle.roomId}`);
      }
    });
  }
}

import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { store } from '../store';
import {
  addMessage,
  updateMessage,
  removeMessage,
  addReaction,
  removeReaction,
  addTypingUser,
  removeTypingUser,
  addReadReceipt,
} from '../store/slices/messagesSlice';
import {
  updateConversationLastMessage,
  incrementUnreadCount,
} from '../store/slices/conversationsSlice';
import { userOnline, userOffline } from '../store/slices/usersSlice';
import { SOCKET_URL } from '../config/api.config';

let chatSocket: Socket | null = null;
let appStateSubscription: any = null;
let reconnectTimer: NodeJS.Timeout | null = null;

// Handle app state changes for better socket management
const handleAppStateChange = (nextAppState: AppStateStatus) => {
  console.log('📱 App state changed:', nextAppState);

  if (nextAppState === 'active') {
    // App came to foreground - ensure socket is connected
    if (chatSocket && !chatSocket.connected) {
      console.log('🔄 App active - reconnecting socket...');
      chatSocket.connect();
    }
  } else if (nextAppState === 'background') {
    // App went to background - socket.io handles this automatically
    console.log('📱 App in background - socket will maintain connection');
  }
};

export const initializeSocket = () => {
  const state = store.getState();
  const token = state.auth.accessToken;

  console.log('🔌 Initializing socket connection...');
  console.log('📍 Socket URL:', SOCKET_URL);
  console.log('🔑 Token exists:', !!token);
  console.log('🔗 Already connected:', !!chatSocket?.connected);

  if (!token) {
    console.log('⚠️ Skipping socket initialization: No token');
    return;
  }

  // If already connected, just return existing socket
  if (chatSocket?.connected) {
    console.log('✅ Socket already connected');
    return chatSocket;
  }

  // Clean up existing disconnected socket
  if (chatSocket) {
    chatSocket.removeAllListeners();
    chatSocket.disconnect();
    chatSocket = null;
  }

  const socketUrl = `${SOCKET_URL}/chat`;
  console.log('🚀 Connecting to:', socketUrl);

  chatSocket = io(socketUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity, // Keep trying to reconnect
    timeout: 20000,
    forceNew: false,
    upgrade: false,
  });

  // Set up app state listener
  if (appStateSubscription) {
    appStateSubscription.remove();
  }
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  chatSocket.on('connect', () => {
    console.log('✅ Connected to chat socket');
    // Explicitly set user status to online
    const userId = store.getState().auth.user?._id;
    if (userId) {
      import('./api').then(({ default: api }) => {
        api.put('/users/me/status', { status: 'online' })
          .catch(err => console.log('Failed to update status:', err));
      });
    }
  });

  chatSocket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    console.error('❌ Error details:', error);
  });

  chatSocket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected from chat socket. Reason:', reason);

    // Handle different disconnect reasons
    if (reason === 'io server disconnect') {
      // Server disconnected us - try to reconnect
      console.log('🔄 Server disconnected - attempting reconnect...');
      chatSocket?.connect();
    } else if (reason === 'transport close' || reason === 'transport error') {
      // Network issue - socket.io will auto-reconnect
      console.log('📡 Network issue - auto-reconnect enabled');
    }
  });

  chatSocket.on('reconnect', (attemptNumber) => {
    console.log('✅ Reconnected to chat socket after', attemptNumber, 'attempts');
  });

  chatSocket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 Reconnection attempt', attemptNumber);
  });

  chatSocket.on('reconnect_error', (error) => {
    console.log('❌ Reconnection error:', error.message);
  });

  chatSocket.on('message:new', (message) => {
    const currentUserId = store.getState().auth.user?._id;
    store.dispatch(addMessage(message));
    store.dispatch(updateConversationLastMessage({
      conversationId: message.conversationId,
      message,
    }));

    if (message.senderId._id !== currentUserId) {
      store.dispatch(incrementUnreadCount(message.conversationId));
    }
  });

  chatSocket.on('message:edited', (message) => {
    store.dispatch(updateMessage(message));
  });

  chatSocket.on('message:deleted', ({ messageId, conversationId }) => {
    store.dispatch(removeMessage({ conversationId, messageId }));
  });

  chatSocket.on('message:reaction:added', ({ messageId, userId, emoji, conversationId }) => {
    // If conversationId is not provided by server, find it (backward compatibility)
    if (!conversationId) {
      const conversations = store.getState().conversations.conversations;
      const conversation = conversations.find(c => {
        const messages = store.getState().messages.messagesByConversation[c._id];
        return messages?.some(m => m._id === messageId);
      });
      conversationId = conversation?._id;
    }

    if (conversationId) {
      store.dispatch(addReaction({
        conversationId,
        messageId,
        reaction: { userId, emoji, createdAt: new Date().toISOString() },
      }));
    }
  });

  chatSocket.on('message:reaction:removed', ({ messageId, userId, emoji, conversationId }) => {
    // If conversationId is not provided by server, find it (backward compatibility)
    if (!conversationId) {
      const conversations = store.getState().conversations.conversations;
      const conversation = conversations.find(c => {
        const messages = store.getState().messages.messagesByConversation[c._id];
        return messages?.some(m => m._id === messageId);
      });
      conversationId = conversation?._id;
    }

    if (conversationId) {
      store.dispatch(removeReaction({
        conversationId,
        messageId,
        userId,
        emoji,
      }));
    }
  });

  chatSocket.on('typing:start', ({ conversationId, userId }) => {
    store.dispatch(addTypingUser({ conversationId, userId }));
  });

  chatSocket.on('typing:stop', ({ conversationId, userId }) => {
    store.dispatch(removeTypingUser({ conversationId, userId }));
  });

  chatSocket.on('user:online', ({ userId }) => {
    store.dispatch(userOnline(userId));
  });

  chatSocket.on('user:offline', ({ userId }) => {
    store.dispatch(userOffline(userId));
  });

  chatSocket.on('message:read', ({ messageId, userId }) => {
    // Find the conversation that contains this message
    const conversations = store.getState().conversations.conversations;
    let conversationId: string | undefined;

    for (const conversation of conversations) {
      const messages = store.getState().messages.messagesByConversation[conversation._id];
      if (messages?.some(m => m._id === messageId)) {
        conversationId = conversation._id;
        break;
      }
    }

    if (conversationId) {
      store.dispatch(addReadReceipt({
        conversationId,
        messageId,
        userId,
        readAt: new Date().toISOString(),
      }));
    }
  });

  return chatSocket;
};

export const disconnectSocket = () => {
  console.log('🔌 Disconnecting socket...');

  // Clear any pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Remove app state listener
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  // Disconnect socket
  if (chatSocket) {
    chatSocket.removeAllListeners();
    chatSocket.disconnect();
    chatSocket = null;
  }

  console.log('✅ Socket disconnected and cleaned up');
};

export const sendMessage = (data: {
  conversationId: string;
  type: string;
  content?: string;
  attachments?: any[];
  replyTo?: string;
}) => {
  return new Promise((resolve, reject) => {
    if (!chatSocket) {
      reject(new Error('Socket not connected'));
      return;
    }

    chatSocket.emit('message:send', data, (response: any) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

export const editMessage = (messageId: string, content: string) => {
  return new Promise((resolve, reject) => {
    if (!chatSocket) {
      reject(new Error('Socket not connected'));
      return;
    }

    chatSocket.emit('message:edit', { messageId, content }, (response: any) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

export const deleteMessage = (messageId: string) => {
  return new Promise((resolve, reject) => {
    if (!chatSocket) {
      reject(new Error('Socket not connected'));
      return;
    }

    chatSocket.emit('message:delete', { messageId }, (response: any) => {
      if (response.success) {
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

export const addMessageReaction = (messageId: string, emoji: string) => {
  return new Promise((resolve, reject) => {
    if (!chatSocket) {
      reject(new Error('Socket not connected'));
      return;
    }

    chatSocket.emit('message:reaction:add', { messageId, emoji }, (response: any) => {
      if (response.success) {
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

export const removeMessageReaction = (messageId: string, emoji: string) => {
  return new Promise((resolve, reject) => {
    if (!chatSocket) {
      reject(new Error('Socket not connected'));
      return;
    }

    chatSocket.emit('message:reaction:remove', { messageId, emoji }, (response: any) => {
      if (response.success) {
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

export const startTyping = (conversationId: string) => {
  if (chatSocket) {
    chatSocket.emit('typing:start', { conversationId });
  }
};

export const stopTyping = (conversationId: string) => {
  if (chatSocket) {
    chatSocket.emit('typing:stop', { conversationId });
  }
};

export const markMessageAsRead = (messageId: string, conversationId: string) => {
  return new Promise((resolve, reject) => {
    if (!chatSocket) {
      reject(new Error('Socket not connected'));
      return;
    }

    chatSocket.emit('message:read', { messageId, conversationId }, (response: any) => {
      if (response.success) {
        resolve(true);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

export const joinConversation = (conversationId: string) => {
  if (chatSocket) {
    chatSocket.emit('conversation:join', { conversationId });
  }
};

export const leaveConversation = (conversationId: string) => {
  if (chatSocket) {
    chatSocket.emit('conversation:leave', { conversationId });
  }
};

export { chatSocket };

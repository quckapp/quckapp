/**
 * SocketManager - Singleton pattern for socket management
 * Design Pattern: Singleton
 * SOLID Principles:
 * - Single Responsibility: Only manages socket connections
 * - Open/Closed: Extensible through event system
 * - Dependency Inversion: Depends on socket.io-client abstraction
 */

import { Socket } from 'socket.io-client';
import { initializeSocket, disconnectSocket, chatSocket } from '../services/socket';
import { initializeWebRTC, disconnectWebRTC, webrtcSocket } from '../services/webrtc';

type SocketEventHandler = (...args: any[]) => void;

class SocketManagerClass {
  private static instance: SocketManagerClass;
  private chatSocket: Socket | null = null;
  private webrtcSocket: Socket | null = null;
  private eventHandlers: Map<string, Set<SocketEventHandler>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private isInitialized: boolean = false;

  // Private constructor for Singleton pattern
  private constructor() {}

  /**
   * Get singleton instance
   * Design Pattern: Singleton
   * @returns SocketManager instance
   */
  static getInstance(): SocketManagerClass {
    if (!SocketManagerClass.instance) {
      SocketManagerClass.instance = new SocketManagerClass();
    }
    return SocketManagerClass.instance;
  }

  /**
   * Initialize sockets
   * Algorithm: Initialization with error handling and reconnection logic
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.chatSocket?.connected) {
      console.log('SocketManager already initialized and connected');
      return;
    }

    try {
      // Initialize chat socket
      this.chatSocket = initializeSocket() || null;

      // Initialize WebRTC socket (async function)
      this.webrtcSocket = await initializeWebRTC() || null;

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ SocketManager initialized successfully');
    } catch (error) {
      console.error('❌ SocketManager initialization failed:', error);
      this.handleReconnection();
    }
  }

  /**
   * Reinitialize sockets after login
   * Call this after successful authentication to establish socket connections
   */
  async reinitialize(): Promise<void> {
    console.log('🔄 Reinitializing sockets after login...');
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    await this.initialize();
  }

  /**
   * Setup event listeners for connection management
   * Design Principle: Separation of Concerns
   */
  private setupEventListeners(): void {
    if (this.chatSocket) {
      this.chatSocket.on('connect', () => {
        console.log('✅ Chat socket connected');
        this.reconnectAttempts = 0;
        this.emit('chat:connected');
      });

      this.chatSocket.on('disconnect', (reason) => {
        console.log('❌ Chat socket disconnected:', reason);
        this.emit('chat:disconnected', reason);
        this.handleReconnection();
      });

      this.chatSocket.on('error', (error) => {
        console.error('❌ Chat socket error:', error);
        this.emit('chat:error', error);
      });
    }

    if (this.webrtcSocket) {
      this.webrtcSocket.on('connect', () => {
        console.log('✅ WebRTC socket connected');
        this.emit('webrtc:connected');
      });

      this.webrtcSocket.on('disconnect', (reason) => {
        console.log('❌ WebRTC socket disconnected:', reason);
        this.emit('webrtc:disconnected', reason);
      });

      this.webrtcSocket.on('error', (error) => {
        console.error('❌ WebRTC socket error:', error);
        this.emit('webrtc:error', error);
      });
    }
  }

  /**
   * Handle reconnection with exponential backoff
   * Algorithm: Exponential backoff for reconnection
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnection:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.initialize();
    }, delay);
  }

  /**
   * Subscribe to socket events
   * Design Pattern: Observer/Pub-Sub
   * @param event - Event name
   * @param handler - Event handler
   */
  on(event: string, handler: SocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from socket events
   * @param event - Event name
   * @param handler - Event handler
   */
  off(event: string, handler: SocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all subscribers
   * Design Pattern: Observer/Pub-Sub
   * @param event - Event name
   * @param args - Event arguments
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if sockets are connected
   * @returns Connection status
   */
  isConnected(): { chat: boolean; webrtc: boolean } {
    return {
      chat: this.chatSocket?.connected || false,
      webrtc: this.webrtcSocket?.connected || false,
    };
  }

  /**
   * Disconnect all sockets
   * Design Principle: Proper cleanup
   */
  disconnect(): void {
    try {
      disconnectSocket();
      disconnectWebRTC();
      this.isInitialized = false;
      this.eventHandlers.clear();
      console.log('✅ SocketManager disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting SocketManager:', error);
    }
  }

  /**
   * Get connection statistics
   * @returns Connection stats
   */
  getStats(): {
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    isInitialized: boolean;
    eventHandlerCount: number;
  } {
    return {
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      isInitialized: this.isInitialized,
      eventHandlerCount: this.eventHandlers.size,
    };
  }
}

// Export singleton instance
export const SocketManager = SocketManagerClass.getInstance();

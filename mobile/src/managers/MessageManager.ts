/**
 * MessageManager - Efficient message management with Map data structure
 * Data Structure: Map for O(1) lookups, Set for O(1) membership testing
 * SOLID Principles:
 * - Single Responsibility: Only manages messages
 * - Open/Closed: Extensible through interfaces
 * Design Pattern: Facade pattern for message operations
 */

import { LRUCache } from '../utils/algorithms';

export interface Message {
  _id: string;
  conversationId: string;
  content: string;
  senderId: any;
  timestamp: string;
  type: string;
  [key: string]: any;
}

class MessageManagerClass {
  private static instance: MessageManagerClass;

  // Data Structures for efficient operations
  private messagesByConversation: Map<string, Map<string, Message>> = new Map();
  private messageCache: LRUCache<string, Message> = new LRUCache(1000);
  private unreadMessages: Map<string, Set<string>> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   * @returns MessageManager instance
   */
  static getInstance(): MessageManagerClass {
    if (!MessageManagerClass.instance) {
      MessageManagerClass.instance = new MessageManagerClass();
    }
    return MessageManagerClass.instance;
  }

  /**
   * Add message to conversation
   * Time Complexity: O(1)
   * @param conversationId - Conversation ID
   * @param message - Message to add
   */
  addMessage(conversationId: string, message: Message): void {
    // Get or create conversation map
    if (!this.messagesByConversation.has(conversationId)) {
      this.messagesByConversation.set(conversationId, new Map());
    }

    const messages = this.messagesByConversation.get(conversationId)!;
    messages.set(message._id, message);

    // Add to cache
    this.messageCache.put(message._id, message);

    // Update search index
    this.updateSearchIndex(message);
  }

  /**
   * Get message by ID
   * Time Complexity: O(1) - Cache hit, O(n) - Cache miss
   * @param messageId - Message ID
   * @returns Message or null
   */
  getMessage(messageId: string): Message | null {
    // Check cache first
    const cached = this.messageCache.get(messageId);
    if (cached) {
      return cached;
    }

    // Search in all conversations (fallback)
    for (const messages of this.messagesByConversation.values()) {
      const message = messages.get(messageId);
      if (message) {
        this.messageCache.put(messageId, message);
        return message;
      }
    }

    return null;
  }

  /**
   * Get messages for conversation
   * Time Complexity: O(n) where n is number of messages
   * Algorithm: Map conversion to sorted array
   * @param conversationId - Conversation ID
   * @param limit - Optional limit
   * @param offset - Optional offset
   * @returns Array of messages
   */
  getMessages(
    conversationId: string,
    limit?: number,
    offset: number = 0,
  ): Message[] {
    const messages = this.messagesByConversation.get(conversationId);

    if (!messages) {
      return [];
    }

    // Convert to array and sort by timestamp
    const sortedMessages = Array.from(messages.values()).sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Apply pagination
    if (limit !== undefined) {
      return sortedMessages.slice(offset, offset + limit);
    }

    return sortedMessages.slice(offset);
  }

  /**
   * Update message
   * Time Complexity: O(1)
   * @param messageId - Message ID
   * @param updates - Message updates
   * @returns Updated message or null
   */
  updateMessage(messageId: string, updates: Partial<Message>): Message | null {
    const message = this.getMessage(messageId);

    if (!message) {
      return null;
    }

    const updatedMessage = { ...message, ...updates };
    const messages = this.messagesByConversation.get(message.conversationId);

    if (messages) {
      messages.set(messageId, updatedMessage);
      this.messageCache.put(messageId, updatedMessage);
      this.updateSearchIndex(updatedMessage);
    }

    return updatedMessage;
  }

  /**
   * Delete message
   * Time Complexity: O(1)
   * @param messageId - Message ID
   * @param conversationId - Conversation ID
   * @returns True if deleted
   */
  deleteMessage(messageId: string, conversationId: string): boolean {
    const messages = this.messagesByConversation.get(conversationId);

    if (!messages) {
      return false;
    }

    const deleted = messages.delete(messageId);

    if (deleted) {
      // Remove from cache
      const cached = this.messageCache.get(messageId);
      if (cached) {
        this.messageCache.put(messageId, null as any); // Mark as deleted
      }

      // Remove from search index
      this.removeFromSearchIndex(messageId);
    }

    return deleted;
  }

  /**
   * Search messages by content
   * Time Complexity: O(k) where k is number of matching messages
   * Algorithm: Inverted index for fast search
   * @param query - Search query
   * @param conversationId - Optional conversation filter
   * @returns Array of matching messages
   */
  searchMessages(query: string, conversationId?: string): Message[] {
    const normalizedQuery = query.toLowerCase();
    const words = normalizedQuery.split(/\s+/);

    // Get message IDs that contain all words (AND search)
    let matchingIds: Set<string> | null = null;

    for (const word of words) {
      const ids = this.searchIndex.get(word);

      if (!ids) {
        return []; // No matches if any word is not found
      }

      if (matchingIds === null) {
        matchingIds = new Set(ids);
      } else {
        // Intersection
        matchingIds = new Set(
          Array.from(matchingIds).filter(id => ids.has(id))
        );
      }
    }

    if (!matchingIds || matchingIds.size === 0) {
      return [];
    }

    // Get messages and filter by conversation if specified
    const results: Message[] = [];

    for (const messageId of matchingIds) {
      const message = this.getMessage(messageId);

      if (message && (!conversationId || message.conversationId === conversationId)) {
        results.push(message);
      }
    }

    return results;
  }

  /**
   * Mark message as read
   * Time Complexity: O(1)
   * @param conversationId - Conversation ID
   * @param messageId - Message ID
   */
  markAsRead(conversationId: string, messageId: string): void {
    const unread = this.unreadMessages.get(conversationId);

    if (unread) {
      unread.delete(messageId);
    }
  }

  /**
   * Mark message as unread
   * Time Complexity: O(1)
   * @param conversationId - Conversation ID
   * @param messageId - Message ID
   */
  markAsUnread(conversationId: string, messageId: string): void {
    if (!this.unreadMessages.has(conversationId)) {
      this.unreadMessages.set(conversationId, new Set());
    }

    this.unreadMessages.get(conversationId)!.add(messageId);
  }

  /**
   * Get unread count for conversation
   * Time Complexity: O(1)
   * @param conversationId - Conversation ID
   * @returns Unread count
   */
  getUnreadCount(conversationId: string): number {
    return this.unreadMessages.get(conversationId)?.size || 0;
  }

  /**
   * Clear messages for conversation
   * Time Complexity: O(n)
   * @param conversationId - Conversation ID
   */
  clearConversation(conversationId: string): void {
    this.messagesByConversation.delete(conversationId);
    this.unreadMessages.delete(conversationId);
  }

  /**
   * Get statistics
   * @returns Manager statistics
   */
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    cacheSize: number;
    unreadCount: number;
  } {
    let totalMessages = 0;
    let unreadCount = 0;

    for (const messages of this.messagesByConversation.values()) {
      totalMessages += messages.size;
    }

    for (const unread of this.unreadMessages.values()) {
      unreadCount += unread.size;
    }

    return {
      totalConversations: this.messagesByConversation.size,
      totalMessages,
      cacheSize: this.messageCache.size,
      unreadCount,
    };
  }

  /**
   * Update search index for message
   * Algorithm: Inverted index construction
   * @param message - Message to index
   */
  private updateSearchIndex(message: Message): void {
    if (!message.content) return;

    const words = message.content.toLowerCase().split(/\s+/);

    for (const word of words) {
      if (word.length < 2) continue; // Skip very short words

      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }

      this.searchIndex.get(word)!.add(message._id);
    }
  }

  /**
   * Remove message from search index
   * @param messageId - Message ID
   */
  private removeFromSearchIndex(messageId: string): void {
    for (const ids of this.searchIndex.values()) {
      ids.delete(messageId);
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.messagesByConversation.clear();
    this.messageCache.clear();
    this.unreadMessages.clear();
    this.searchIndex.clear();
  }
}

// Export singleton instance
export const MessageManager = MessageManagerClass.getInstance();

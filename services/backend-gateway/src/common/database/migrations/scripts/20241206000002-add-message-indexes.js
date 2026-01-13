/**
 * Migration: Add indexes to messages collection
 *
 * This migration adds performance indexes to the messages collection:
 * - Compound index on conversationId and createdAt for message history
 * - Index on sender for user message queries
 * - Text index on content for message search
 */

module.exports = {
  async up(db, client) {
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const messagesCollection = db.collection('messages');

        // Compound index for conversation message history (most common query)
        await messagesCollection.createIndex(
          { conversationId: 1, createdAt: -1 },
          { name: 'idx_conversation_messages' }
        );

        // Index for sender queries
        await messagesCollection.createIndex(
          { sender: 1, createdAt: -1 },
          { name: 'idx_sender_messages' }
        );

        // Index for unread messages
        await messagesCollection.createIndex(
          { conversationId: 1, readBy: 1 },
          { name: 'idx_unread_messages' }
        );

        // Text index for message search
        await messagesCollection.createIndex(
          { content: 'text' },
          { name: 'idx_message_search', default_language: 'english' }
        );

        // Index for message type filtering
        await messagesCollection.createIndex(
          { conversationId: 1, type: 1 },
          { name: 'idx_conversation_message_type' }
        );

        // TTL index for deleted messages cleanup (30 days)
        await messagesCollection.createIndex(
          { deletedAt: 1 },
          { name: 'idx_deleted_messages_ttl', expireAfterSeconds: 2592000, sparse: true }
        );

        console.log('[Migration] Created message indexes successfully');
      });
    } finally {
      await session.endSession();
    }
  },

  async down(db, client) {
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const messagesCollection = db.collection('messages');

        // Drop indexes
        await messagesCollection.dropIndex('idx_conversation_messages').catch(() => {});
        await messagesCollection.dropIndex('idx_sender_messages').catch(() => {});
        await messagesCollection.dropIndex('idx_unread_messages').catch(() => {});
        await messagesCollection.dropIndex('idx_message_search').catch(() => {});
        await messagesCollection.dropIndex('idx_conversation_message_type').catch(() => {});
        await messagesCollection.dropIndex('idx_deleted_messages_ttl').catch(() => {});

        console.log('[Migration] Dropped message indexes successfully');
      });
    } finally {
      await session.endSession();
    }
  },
};

/**
 * Migration: Add indexes to users collection
 *
 * This migration adds performance indexes to the users collection:
 * - Compound index on phoneNumber and email for faster lookups
 * - Index on createdAt for sorting
 * - Index on lastSeen for activity queries
 */

module.exports = {
  async up(db, client) {
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const usersCollection = db.collection('users');

        // Create indexes
        await usersCollection.createIndex(
          { phoneNumber: 1 },
          { unique: true, sparse: true, name: 'idx_phone_number' }
        );

        await usersCollection.createIndex(
          { email: 1 },
          { unique: true, sparse: true, name: 'idx_email' }
        );

        await usersCollection.createIndex(
          { createdAt: -1 },
          { name: 'idx_created_at' }
        );

        await usersCollection.createIndex(
          { lastSeen: -1 },
          { name: 'idx_last_seen' }
        );

        await usersCollection.createIndex(
          { role: 1 },
          { name: 'idx_role' }
        );

        console.log('[Migration] Created user indexes successfully');
      });
    } finally {
      await session.endSession();
    }
  },

  async down(db, client) {
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const usersCollection = db.collection('users');

        // Drop indexes
        await usersCollection.dropIndex('idx_phone_number').catch(() => {});
        await usersCollection.dropIndex('idx_email').catch(() => {});
        await usersCollection.dropIndex('idx_created_at').catch(() => {});
        await usersCollection.dropIndex('idx_last_seen').catch(() => {});
        await usersCollection.dropIndex('idx_role').catch(() => {});

        console.log('[Migration] Dropped user indexes successfully');
      });
    } finally {
      await session.endSession();
    }
  },
};

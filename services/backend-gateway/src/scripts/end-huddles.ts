/**
 * Script to end all active huddles
 * Run with: npx ts-node src/scripts/end-huddles.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function endAllHuddles() {
  // Use prod database (quickchat, not quickchat-dev)
  const mongoUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected');

  // List all collections
  const collections = await mongoose.connection.db!.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name).join(', '));

  // First, let's see what huddles exist
  const huddles = await mongoose.connection.db!.collection('huddles').find({}).toArray();
  console.log(`Found ${huddles.length} huddles total`);
  huddles.forEach(h => {
    console.log(`  - ID: ${h._id}, Status: ${h.status}, RoomId: ${h.roomId}`);
  });

  const result = await mongoose.connection.db!.collection('huddles').updateMany(
    { status: 'active' },
    { $set: { status: 'ended', endedAt: new Date() } }
  );

  console.log(`Updated ${result.modifiedCount} huddles from 'active' to 'ended'`);

  await mongoose.disconnect();
  console.log('Disconnected');
  process.exit(0);
}

endAllHuddles().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

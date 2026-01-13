import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from '../modules/conversations/schemas/conversation.schema';

async function fixConversations() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const conversationModel = app.get<Model<Conversation>>('ConversationModel');

  console.log('🔧 Starting conversation fix...');

  // Delete all existing conversations
  const deleteResult = await conversationModel.deleteMany({});
  console.log(`✅ Deleted ${deleteResult.deletedCount} conversations`);

  console.log('✅ Conversations cleared. New conversations will be created with proper structure.');

  await app.close();
}

fixConversations()
  .then(() => {
    console.log('✅ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

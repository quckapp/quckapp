import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      this.logger.warn('OpenAI API key not configured. AI search will not be available.');
      this.openai = null;
    } else {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI service initialized successfully');
    }
  }

  async searchConversations(
    query: string,
    conversations: any[],
    currentUserId: string,
  ): Promise<any[]> {
    if (!this.openai) {
      throw new Error(
        'OpenAI API is not configured. Please add OPENAI_API_KEY to your environment variables.',
      );
    }

    try {
      this.logger.log(`AI search query: "${query}" for user ${currentUserId}`);

      // Format conversations for AI
      const conversationsData = conversations.map((conv, index) => {
        const otherParticipants = conv.participants
          .filter((p: any) => p.userId._id?.toString() !== currentUserId)
          .map((p: any) => ({
            name: p.userId.displayName || p.userId.phoneNumber,
            id: p.userId._id,
          }));

        return {
          index,
          id: conv._id,
          type: conv.type,
          name: conv.type === 'group' ? conv.name : null,
          participants: otherParticipants,
          lastMessage: conv.lastMessage
            ? {
                content: conv.lastMessage.content,
                type: conv.lastMessage.type,
                createdAt: conv.lastMessage.createdAt,
              }
            : null,
          lastMessageAt: conv.lastMessageAt,
        };
      });

      // Create prompt for OpenAI
      const prompt = `You are a smart search assistant for a messaging app. Analyze the following conversations and return the most relevant ones based on the user's search query.

User Query: "${query}"

Conversations:
${JSON.stringify(conversationsData, null, 2)}

Instructions:
1. Analyze the query to understand what the user is looking for
2. Consider conversation participants, last messages, message types, and timing
3. Return a JSON array of relevant conversation indices, ordered by relevance (most relevant first)
4. Include a brief explanation for each result
5. Return ONLY valid JSON in this exact format:
{
  "results": [
    {
      "index": 0,
      "relevanceScore": 0.95,
      "reason": "Brief explanation of why this is relevant"
    }
  ]
}

If no conversations match the query, return {"results": []}.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful search assistant. Always respond with valid JSON only, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0].message.content?.trim() || '{}';
      this.logger.debug(`AI response: ${responseText}`);

      // Parse AI response
      const aiResponse = JSON.parse(responseText);

      // Map results back to actual conversations
      const results = aiResponse.results
        .map((result: any) => {
          const conversation = conversations[result.index];
          if (!conversation) {
            return null;
          }

          return {
            ...conversation,
            aiRelevance: {
              score: result.relevanceScore,
              reason: result.reason,
            },
          };
        })
        .filter((conv: any) => conv !== null);

      this.logger.log(`AI search found ${results.length} relevant conversations`);
      return results;
    } catch (error) {
      this.logger.error('Error in AI search:', error);
      throw new Error(`AI search failed: ${error.message}`);
    }
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { Message, MessageDocument } from '../messages/schemas/message.schema';

export interface TranscriptionResult {
  messageId: string;
  transcription: string;
  language?: string;
  duration?: number;
  confidence?: number;
}

@Injectable()
export class TranscriptionService {
  private openai: OpenAI | null = null;

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async transcribeMessage(messageId: string): Promise<TranscriptionResult> {
    // Find the message
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.type !== 'audio') {
      throw new BadRequestException('Only audio messages can be transcribed');
    }

    // Check if already transcribed
    if (message.metadata?.transcription) {
      return {
        messageId,
        transcription: message.metadata.transcription,
        language: message.metadata.transcriptionLanguage,
        duration: message.attachments?.[0]?.duration,
      };
    }

    // Get audio file path
    const audioAttachment = message.attachments?.[0];
    if (!audioAttachment?.url) {
      throw new BadRequestException('No audio attachment found');
    }

    // Transcribe using OpenAI Whisper if available
    let transcription: string;
    let language: string | undefined;

    if (this.openai) {
      try {
        const result = await this.transcribeWithWhisper(audioAttachment.url);
        transcription = result.text;
        language = result.language;
      } catch (error) {
        // Fallback to placeholder if Whisper fails
        transcription = '[Transcription unavailable]';
      }
    } else {
      // No OpenAI key configured
      transcription = '[Transcription service not configured. Set OPENAI_API_KEY to enable.]';
    }

    // Save transcription to message metadata
    await this.messageModel
      .findByIdAndUpdate(messageId, {
        $set: {
          'metadata.transcription': transcription,
          'metadata.transcriptionLanguage': language,
          'metadata.transcribedAt': new Date(),
        },
      })
      .exec();

    return {
      messageId,
      transcription,
      language,
      duration: audioAttachment.duration,
    };
  }

  private async transcribeWithWhisper(
    audioUrl: string,
  ): Promise<{ text: string; language?: string }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Handle local file paths
    let filePath: string;
    if (audioUrl.startsWith('/uploads/')) {
      filePath = path.join(process.cwd(), audioUrl);
    } else if (audioUrl.startsWith('http')) {
      // For remote URLs, we'd need to download first
      // For now, throw an error
      throw new Error('Remote audio URLs not supported yet');
    } else {
      filePath = audioUrl;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('Audio file not found');
    }

    // Create a read stream
    const audioFile = fs.createReadStream(filePath);

    // Call Whisper API
    const response = await this.openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    return {
      text: response.text,
      language: (response as any).language,
    };
  }

  async batchTranscribe(messageIds: string[]): Promise<TranscriptionResult[]> {
    const results: TranscriptionResult[] = [];

    for (const messageId of messageIds) {
      try {
        const result = await this.transcribeMessage(messageId);
        results.push(result);
      } catch (error) {
        results.push({
          messageId,
          transcription: `[Error: ${error.message}]`,
        });
      }
    }

    return results;
  }

  async getTranscription(messageId: string): Promise<TranscriptionResult | null> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (!message.metadata?.transcription) {
      return null;
    }

    return {
      messageId,
      transcription: message.metadata.transcription,
      language: message.metadata.transcriptionLanguage,
      duration: message.attachments?.[0]?.duration,
    };
  }

  async searchTranscriptions(
    conversationId: string,
    query: string,
    limit: number = 20,
  ): Promise<MessageDocument[]> {
    return this.messageModel
      .find({
        conversationId,
        type: 'audio',
        'metadata.transcription': { $regex: query, $options: 'i' },
        isDeleted: false,
      })
      .populate('senderId', '-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}

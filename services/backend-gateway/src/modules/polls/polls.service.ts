import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Poll, PollDocument, PollOption } from './schemas/poll.schema';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';

@Injectable()
export class PollsService {
  constructor(
    @InjectModel(Poll.name) private pollModel: Model<PollDocument>,
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
  ) {}

  async createPoll(
    creatorId: string,
    conversationId: string,
    question: string,
    optionTexts: string[],
    options?: {
      allowMultipleAnswers?: boolean;
      isAnonymous?: boolean;
      expiresInHours?: number;
    },
  ): Promise<PollDocument> {
    // Verify user is part of the conversation
    const conversation = await this.conversationsService.findById(conversationId);
    const isParticipant = conversation.participants.some(
      (p: any) => p.userId._id?.toString() === creatorId || p.userId.toString() === creatorId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    // Polls only in group conversations
    if (conversation.type !== 'group') {
      throw new ForbiddenException('Polls can only be created in group conversations');
    }

    // Validate options
    if (optionTexts.length < 2) {
      throw new BadRequestException('Poll must have at least 2 options');
    }

    if (optionTexts.length > 10) {
      throw new BadRequestException('Poll can have maximum 10 options');
    }

    // Create poll options
    const pollOptions: PollOption[] = optionTexts.map((text) => ({
      id: uuidv4(),
      text,
      voters: [],
      voteCount: 0,
    }));

    // Calculate expiration
    let expiresAt: Date | undefined;
    if (options?.expiresInHours) {
      expiresAt = new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000);
    }

    // Create the poll
    const poll = new this.pollModel({
      conversationId,
      creatorId,
      question,
      options: pollOptions,
      allowMultipleAnswers: options?.allowMultipleAnswers ?? false,
      isAnonymous: options?.isAnonymous ?? true,
      expiresAt,
    });

    const savedPoll = await poll.save();

    // Create a message for the poll
    const message = await this.messagesService.createMessage(
      conversationId,
      creatorId,
      'poll' as any,
      question,
      [],
      undefined,
      {
        pollId: savedPoll._id.toString(),
        options: pollOptions.map((o) => ({ id: o.id, text: o.text })),
        allowMultipleAnswers: options?.allowMultipleAnswers ?? false,
        expiresAt,
      },
    );

    // Update poll with message ID
    savedPoll.messageId = message._id.toString();
    await savedPoll.save();

    return savedPoll;
  }

  async findById(id: string): Promise<PollDocument> {
    const poll = await this.pollModel
      .findById(id)
      .populate('creatorId', 'username displayName avatar')
      .exec();

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return poll;
  }

  async vote(pollId: string, oderId: string, optionIds: string[]): Promise<PollDocument> {
    const poll = await this.findById(pollId);

    // Check if poll is closed
    if (poll.isClosed) {
      throw new ForbiddenException('This poll is closed');
    }

    // Check if poll has expired
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      throw new ForbiddenException('This poll has expired');
    }

    // Validate options
    if (!poll.allowMultipleAnswers && optionIds.length > 1) {
      throw new BadRequestException('This poll only allows one answer');
    }

    // Verify all option IDs are valid
    for (const optionId of optionIds) {
      const optionExists = poll.options.some((o) => o.id === optionId);
      if (!optionExists) {
        throw new BadRequestException(`Invalid option ID: ${optionId}`);
      }
    }

    // Remove previous votes from this user
    for (const option of poll.options) {
      const voterIndex = option.voters.indexOf(oderId);
      if (voterIndex !== -1) {
        option.voters.splice(voterIndex, 1);
        option.voteCount = Math.max(0, option.voteCount - 1);
      }
    }

    // Add new votes
    for (const optionId of optionIds) {
      const option = poll.options.find((o) => o.id === optionId);
      if (option && !option.voters.includes(oderId)) {
        option.voters.push(oderId);
        option.voteCount++;
      }
    }

    // Update total votes
    poll.totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);

    return poll.save();
  }

  async removeVote(pollId: string, oderId: string): Promise<PollDocument> {
    const poll = await this.findById(pollId);

    // Check if poll is closed
    if (poll.isClosed) {
      throw new ForbiddenException('This poll is closed');
    }

    // Remove votes from this user
    for (const option of poll.options) {
      const voterIndex = option.voters.indexOf(oderId);
      if (voterIndex !== -1) {
        option.voters.splice(voterIndex, 1);
        option.voteCount = Math.max(0, option.voteCount - 1);
      }
    }

    // Update total votes
    poll.totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);

    return poll.save();
  }

  async closePoll(pollId: string, userId: string): Promise<PollDocument> {
    const poll = await this.findById(pollId);

    // Only creator can close the poll
    if (poll.creatorId.toString() !== userId) {
      throw new ForbiddenException('Only the poll creator can close the poll');
    }

    if (poll.isClosed) {
      throw new BadRequestException('Poll is already closed');
    }

    poll.isClosed = true;
    poll.closedAt = new Date();
    poll.closedBy = userId;

    return poll.save();
  }

  async getConversationPolls(conversationId: string, userId: string): Promise<PollDocument[]> {
    // Verify user is part of the conversation
    const conversation = await this.conversationsService.findById(conversationId);
    const isParticipant = conversation.participants.some(
      (p: any) => p.userId._id?.toString() === userId || p.userId.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    return this.pollModel
      .find({ conversationId })
      .populate('creatorId', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPollResults(
    pollId: string,
    userId: string,
  ): Promise<{
    poll: PollDocument;
    userVotes: string[];
    results: {
      optionId: string;
      text: string;
      voteCount: number;
      percentage: number;
      voters?: string[];
    }[];
  }> {
    const poll = await this.pollModel
      .findById(pollId)
      .populate('creatorId', 'username displayName avatar')
      .populate('options.voters', 'username displayName avatar')
      .exec();

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    // Find user's votes
    const userVotes: string[] = [];
    for (const option of poll.options) {
      if (option.voters.some((v: any) => v._id?.toString() === userId || v.toString() === userId)) {
        userVotes.push(option.id);
      }
    }

    // Calculate results
    const results = poll.options.map((option) => ({
      optionId: option.id,
      text: option.text,
      voteCount: option.voteCount,
      percentage: poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0,
      voters: poll.isAnonymous ? undefined : option.voters,
    }));

    return { poll, userVotes, results };
  }

  async deletePoll(pollId: string, userId: string): Promise<void> {
    const poll = await this.findById(pollId);

    // Only creator can delete the poll
    if (poll.creatorId.toString() !== userId) {
      throw new ForbiddenException('Only the poll creator can delete the poll');
    }

    await this.pollModel.findByIdAndDelete(pollId).exec();

    // Optionally delete the associated message
    if (poll.messageId) {
      try {
        await this.messagesService.deleteMessage(poll.messageId, userId);
      } catch (error) {
        // Message might already be deleted
      }
    }
  }
}

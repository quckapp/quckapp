import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { Message } from './schemas/message.schema';

describe('MessagesService', () => {
  let service: MessagesService;
  let messageModel: any;
  let conversationsService: jest.Mocked<ConversationsService>;

  const mockMessage = {
    _id: '507f1f77bcf86cd799439014',
    conversationId: '507f1f77bcf86cd799439012',
    senderId: '507f1f77bcf86cd799439011',
    type: 'text',
    content: 'Hello, this is a test message',
    encryptedContent: 'encrypted',
    attachments: [],
    reactions: [],
    readReceipts: [],
    replyTo: null,
    isEdited: false,
    isDeleted: false,
    isForwarded: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockConversation = {
    _id: '507f1f77bcf86cd799439012',
    participants: [{ userId: '507f1f77bcf86cd799439011' }, { userId: '507f1f77bcf86cd799439013' }],
  };

  beforeEach(async () => {
    const mockMessageModel = {
      new: jest.fn().mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue({ ...mockMessage, ...data }),
      })),
      constructor: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
      countDocuments: jest.fn(),
    };

    // Make the model callable as a constructor
    function MockModel(data: any) {
      return {
        ...data,
        save: jest.fn().mockResolvedValue({ ...mockMessage, ...data, _id: mockMessage._id }),
      };
    }
    Object.assign(MockModel, mockMessageModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: MockModel,
        },
        {
          provide: ConversationsService,
          useValue: {
            updateLastMessage: jest.fn(),
            getUserConversations: jest.fn().mockResolvedValue([mockConversation]),
            findById: jest.fn().mockResolvedValue(mockConversation),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-encryption-key'),
          },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    messageModel = module.get(getModelToken(Message.name));
    conversationsService = module.get(ConversationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    it('should create a text message successfully', async () => {
      const result = await service.createMessage(
        mockMessage.conversationId,
        mockMessage.senderId,
        'text',
        'Hello, world!',
      );

      expect(result).toHaveProperty('_id');
      expect(result.type).toBe('text');
      expect(conversationsService.updateLastMessage).toHaveBeenCalled();
    });

    it('should create a message with attachments', async () => {
      const attachments = [{ type: 'image', url: '/uploads/image.jpg' }];

      const result = await service.createMessage(
        mockMessage.conversationId,
        mockMessage.senderId,
        'image',
        undefined,
        attachments,
      );

      expect(result).toHaveProperty('_id');
      expect(result.type).toBe('image');
    });

    it('should create a message with expiration time', async () => {
      const result = await service.createMessage(
        mockMessage.conversationId,
        mockMessage.senderId,
        'text',
        'Disappearing message',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        86400, // 24 hours
      );

      expect(result).toHaveProperty('expiresAt');
    });
  });

  describe('findById', () => {
    it('should return a message by ID', async () => {
      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMessage),
      });

      const result = await service.findById(mockMessage._id);

      expect(result).toEqual(mockMessage);
    });

    it('should throw NotFoundException for non-existent message', async () => {
      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConversationMessages', () => {
    it('should return messages for a conversation', async () => {
      const mockMessages = [mockMessage, { ...mockMessage, _id: '2' }];

      messageModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      });

      const result = await service.getConversationMessages(mockMessage.conversationId);

      expect(result).toHaveLength(2);
    });

    it('should support pagination with before parameter', async () => {
      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMessage),
      });

      messageModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMessage]),
      });

      const result = await service.getConversationMessages(
        mockMessage.conversationId,
        50,
        mockMessage._id,
      );

      expect(result).toBeDefined();
    });
  });

  describe('editMessage', () => {
    it('should edit a message successfully', async () => {
      const updatedMessage = { ...mockMessage, content: 'Updated content', isEdited: true };

      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          senderId: { toString: () => mockMessage.senderId },
        }),
      });

      messageModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedMessage),
      });

      const result = await service.editMessage(
        mockMessage._id,
        mockMessage.senderId,
        'Updated content',
      );

      expect(result.content).toBe('Updated content');
      expect(result.isEdited).toBe(true);
    });

    it('should throw ForbiddenException when editing others message', async () => {
      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          senderId: { toString: () => 'different-user' },
        }),
      });

      await expect(
        service.editMessage(mockMessage._id, mockMessage.senderId, 'Updated'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when editing non-text message', async () => {
      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          type: 'image',
          senderId: { toString: () => mockMessage.senderId },
        }),
      });

      await expect(
        service.editMessage(mockMessage._id, mockMessage.senderId, 'Updated'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete a message', async () => {
      const deletedMessage = {
        ...mockMessage,
        isDeleted: true,
        content: null,
        attachments: [],
      };

      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          senderId: { toString: () => mockMessage.senderId },
        }),
      });

      messageModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(deletedMessage),
      });

      const result = await service.deleteMessage(mockMessage._id, mockMessage.senderId);

      expect(result.isDeleted).toBe(true);
      expect(result.content).toBeNull();
    });

    it('should throw ForbiddenException when deleting others message', async () => {
      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          senderId: { toString: () => 'different-user' },
        }),
      });

      await expect(service.deleteMessage(mockMessage._id, mockMessage.senderId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addReaction', () => {
    it('should add a reaction to a message', async () => {
      const messageWithReaction = {
        ...mockMessage,
        reactions: [{ emoji: '👍', userId: mockMessage.senderId }],
      };

      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          reactions: [],
        }),
      });

      messageModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(messageWithReaction),
      });

      const result = await service.addReaction(mockMessage._id, mockMessage.senderId, '👍');

      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0].emoji).toBe('👍');
    });

    it('should not add duplicate reaction', async () => {
      const existingReaction = {
        emoji: '👍',
        userId: { toString: () => mockMessage.senderId },
      };

      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          reactions: [existingReaction],
        }),
      });

      const result = await service.addReaction(mockMessage._id, mockMessage.senderId, '👍');

      // Should return existing message without calling update
      expect(messageModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction from a message', async () => {
      const messageWithoutReaction = { ...mockMessage, reactions: [] };

      messageModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(messageWithoutReaction),
      });

      const result = await service.removeReaction(mockMessage._id, mockMessage.senderId, '👍');

      expect(result.reactions).toHaveLength(0);
    });
  });

  describe('addReadReceipt', () => {
    it('should add a read receipt', async () => {
      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockMessage, readReceipts: [] }),
      });

      messageModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await service.addReadReceipt(mockMessage._id, 'reader-user-id');

      expect(messageModel.updateOne).toHaveBeenCalled();
    });

    it('should not add duplicate read receipt', async () => {
      const existingReceipt = { userId: { toString: () => 'reader-user-id' } };

      messageModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockMessage,
          readReceipts: [existingReceipt],
        }),
      });

      await service.addReadReceipt(mockMessage._id, 'reader-user-id');

      expect(messageModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('searchMessages', () => {
    it('should search messages by text', async () => {
      const searchResults = [mockMessage];

      messageModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(searchResults),
      });

      messageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.searchMessages(mockMessage.senderId, 'test');

      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});

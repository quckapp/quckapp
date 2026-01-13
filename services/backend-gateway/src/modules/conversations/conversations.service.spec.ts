import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { Conversation } from './schemas/conversation.schema';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let conversationModel: any;

  const mockUser1Id = '507f1f77bcf86cd799439011';
  const mockUser2Id = '507f1f77bcf86cd799439013';

  const mockConversation = {
    _id: '507f1f77bcf86cd799439012',
    type: 'single',
    name: null,
    avatar: null,
    participants: [
      {
        userId: mockUser1Id,
        joinedAt: new Date(),
        unreadCount: 0,
        isMuted: false,
        isPinned: false,
      },
      {
        userId: mockUser2Id,
        joinedAt: new Date(),
        unreadCount: 0,
        isMuted: false,
        isPinned: false,
      },
    ],
    admins: [],
    lastMessage: null,
    lastMessageAt: new Date(),
    isArchived: false,
    isLocked: false,
    pinnedMessages: [],
    disappearingMessagesTimer: 0,
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockGroupConversation = {
    ...mockConversation,
    _id: '507f1f77bcf86cd799439020',
    type: 'group',
    name: 'Test Group',
    admins: [mockUser1Id],
  };

  beforeEach(async () => {
    function MockConversationModel(data: any) {
      return {
        ...data,
        save: jest.fn().mockResolvedValue({ ...mockConversation, ...data }),
      };
    }

    Object.assign(MockConversationModel, {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: MockConversationModel,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    conversationModel = module.get(getModelToken(Conversation.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSingleConversation', () => {
    it('should return existing conversation if already exists', async () => {
      conversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      const result = await service.createSingleConversation(mockUser1Id, mockUser2Id);

      expect(result._id).toBe(mockConversation._id);
    });

    it('should create new conversation if not exists', async () => {
      conversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createSingleConversation(mockUser1Id, mockUser2Id);

      expect(result.type).toBe('single');
      expect(result.participants).toHaveLength(2);
    });
  });

  describe('createGroupConversation', () => {
    it('should create a group conversation', async () => {
      const result = await service.createGroupConversation(
        mockUser1Id,
        'New Group',
        [mockUser2Id],
        'Group description',
      );

      expect(result.type).toBe('group');
      expect(result.name).toBe('New Group');
      expect(result.admins).toContain(mockUser1Id);
    });

    it('should include creator as participant', async () => {
      const result = await service.createGroupConversation(mockUser1Id, 'New Group', [mockUser2Id]);

      const participantIds = result.participants.map((p: any) => p.userId);
      expect(participantIds).toContain(mockUser1Id);
    });
  });

  describe('findById', () => {
    it('should return conversation by ID', async () => {
      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      const result = await service.findById(mockConversation._id);

      expect(result._id).toBe(mockConversation._id);
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserConversations', () => {
    it('should return all conversations for a user', async () => {
      const mockConversations = [mockConversation, mockGroupConversation];

      conversationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockConversations),
      });

      const result = await service.getUserConversations(mockUser1Id);

      expect(result).toHaveLength(2);
    });
  });

  describe('addParticipants', () => {
    it('should add participants to group conversation', async () => {
      const newParticipantId = '507f1f77bcf86cd799439099';

      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGroupConversation),
      });

      conversationModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockGroupConversation,
          participants: [...mockGroupConversation.participants, { userId: newParticipantId }],
        }),
      });

      const result = await service.addParticipants(mockGroupConversation._id, mockUser1Id, [
        newParticipantId,
      ]);

      expect(result.participants.length).toBeGreaterThan(mockGroupConversation.participants.length);
    });

    it('should throw ForbiddenException for single conversation', async () => {
      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      await expect(
        service.addParticipants(mockConversation._id, mockUser1Id, ['new-user']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGroupConversation),
      });

      await expect(
        service.addParticipants(mockGroupConversation._id, 'non-admin-user', ['new-user']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from group', async () => {
      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGroupConversation),
      });

      conversationModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockGroupConversation,
          participants: [mockGroupConversation.participants[0]],
        }),
      });

      const result = await service.removeParticipant(
        mockGroupConversation._id,
        mockUser1Id,
        mockUser2Id,
      );

      expect(result.participants).toHaveLength(1);
    });
  });

  describe('pinMessage', () => {
    it('should pin a message in conversation', async () => {
      const messageId = '507f1f77bcf86cd799439050';
      const conversationWithUser = {
        ...mockConversation,
        participants: [
          { userId: { _id: { toString: () => mockUser1Id } } },
          { userId: { _id: { toString: () => mockUser2Id } } },
        ],
        pinnedMessages: [],
      };

      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(conversationWithUser),
      });

      conversationModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...conversationWithUser,
          pinnedMessages: [messageId],
        }),
      });

      const result = await service.pinMessage(mockConversation._id, mockUser1Id, messageId);

      expect(result.pinnedMessages).toContain(messageId);
    });

    it('should throw ForbiddenException when max pins reached', async () => {
      const conversationWithMaxPins = {
        ...mockConversation,
        participants: [{ userId: { _id: { toString: () => mockUser1Id } } }],
        pinnedMessages: Array(10).fill('msg-id'),
      };

      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(conversationWithMaxPins),
      });

      await expect(
        service.pinMessage(mockConversation._id, mockUser1Id, 'new-msg'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setDisappearingMessagesTimer', () => {
    it('should set disappearing messages timer', async () => {
      const conversationWithUser = {
        ...mockConversation,
        participants: [{ userId: { _id: { toString: () => mockUser1Id } } }],
      };

      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(conversationWithUser),
      });

      conversationModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...conversationWithUser,
          disappearingMessagesTimer: 86400,
        }),
      });

      const result = await service.setDisappearingMessagesTimer(
        mockConversation._id,
        mockUser1Id,
        86400,
      );

      expect(result.disappearingMessagesTimer).toBe(86400);
    });

    it('should throw ForbiddenException for invalid timer value', async () => {
      const conversationWithUser = {
        ...mockConversation,
        participants: [{ userId: { _id: { toString: () => mockUser1Id } } }],
      };

      conversationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(conversationWithUser),
      });

      await expect(
        service.setDisappearingMessagesTimer(mockConversation._id, mockUser1Id, 12345),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggleMute', () => {
    it('should mute a conversation', async () => {
      conversationModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await service.toggleMute(mockConversation._id, mockUser1Id, true);

      expect(conversationModel.updateOne).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation as read', async () => {
      conversationModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await service.markAsRead(mockConversation._id, mockUser1Id, 'message-id');

      expect(conversationModel.updateOne).toHaveBeenCalled();
    });
  });
});

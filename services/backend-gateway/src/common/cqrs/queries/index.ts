/**
 * CQRS Queries - Read operations that don't change state
 * Queries should be named to describe what data is being retrieved
 */

// ============================================
// USER QUERIES
// ============================================

export class GetUserByIdQuery {
  constructor(public readonly userId: string) {}
}

export class GetUserByPhoneQuery {
  constructor(public readonly phoneNumber: string) {}
}

export class GetUserProfileQuery {
  constructor(
    public readonly userId: string,
    public readonly requesterId?: string, // For privacy filtering
  ) {}
}

export class SearchUsersQuery {
  constructor(
    public readonly searchTerm: string,
    public readonly limit: number = 20,
    public readonly offset: number = 0,
    public readonly excludeUserIds?: string[],
  ) {}
}

export class GetUserContactsQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 100,
    public readonly offset: number = 0,
  ) {}
}

export class GetUserPresenceQuery {
  constructor(public readonly userIds: string[]) {}
}

export class GetBlockedUsersQuery {
  constructor(public readonly userId: string) {}
}

// ============================================
// MESSAGE QUERIES
// ============================================

export class GetMessageByIdQuery {
  constructor(
    public readonly messageId: string,
    public readonly userId: string, // For access validation
  ) {}
}

export class GetConversationMessagesQuery {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly limit: number = 50,
    public readonly before?: string, // messageId for pagination
    public readonly after?: string,
  ) {}
}

export class SearchMessagesQuery {
  constructor(
    public readonly userId: string,
    public readonly searchTerm: string,
    public readonly conversationId?: string,
    public readonly messageType?: string,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly limit: number = 20,
    public readonly offset: number = 0,
  ) {}
}

export class GetPinnedMessagesQuery {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}

export class GetStarredMessagesQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}

export class GetMediaMessagesQuery {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly mediaType?: 'image' | 'video' | 'audio' | 'file',
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}

export class GetUnreadCountQuery {
  constructor(public readonly userId: string) {}
}

// ============================================
// CONVERSATION QUERIES
// ============================================

export class GetConversationByIdQuery {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}

export class GetUserConversationsQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
    public readonly includeArchived: boolean = false,
  ) {}
}

export class GetConversationParticipantsQuery {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}

export class GetArchivedConversationsQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}

export class GetDirectConversationQuery {
  constructor(
    public readonly userId1: string,
    public readonly userId2: string,
  ) {}
}

// ============================================
// CALL QUERIES
// ============================================

export class GetCallByIdQuery {
  constructor(
    public readonly callId: string,
    public readonly userId: string,
  ) {}
}

export class GetCallHistoryQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
    public readonly callType?: 'audio' | 'video',
    public readonly status?: 'completed' | 'missed' | 'rejected',
  ) {}
}

export class GetActiveCallsQuery {
  constructor(public readonly userId: string) {}
}

// ============================================
// STATUS QUERIES
// ============================================

export class GetUserStatusesQuery {
  constructor(
    public readonly userId: string,
    public readonly viewerId: string,
  ) {}
}

export class GetContactStatusesQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 50,
  ) {}
}

export class GetStatusViewersQuery {
  constructor(
    public readonly statusId: string,
    public readonly userId: string, // For ownership validation
  ) {}
}

// ============================================
// POLL QUERIES
// ============================================

export class GetPollByIdQuery {
  constructor(
    public readonly pollId: string,
    public readonly userId: string,
  ) {}
}

export class GetPollResultsQuery {
  constructor(
    public readonly pollId: string,
    public readonly userId: string,
  ) {}
}

// ============================================
// NOTIFICATION QUERIES
// ============================================

export class GetUserNotificationsQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
    public readonly unreadOnly: boolean = false,
  ) {}
}

export class GetUnreadNotificationCountQuery {
  constructor(public readonly userId: string) {}
}

// ============================================
// ANALYTICS QUERIES
// ============================================

export class GetUserAnalyticsQuery {
  constructor(
    public readonly userId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}
}

export class GetConversationAnalyticsQuery {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}
}

export class GetSystemAnalyticsQuery {
  constructor(
    public readonly adminId: string, // For authorization
    public readonly metrics: string[],
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}
}

// ============================================
// COMMUNITY QUERIES
// ============================================

export class GetCommunityByIdQuery {
  constructor(
    public readonly communityId: string,
    public readonly userId: string,
  ) {}
}

export class GetUserCommunitiesQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}

export class GetCommunityMembersQuery {
  constructor(
    public readonly communityId: string,
    public readonly userId: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}

export class SearchCommunitiesQuery {
  constructor(
    public readonly searchTerm: string,
    public readonly limit: number = 20,
    public readonly offset: number = 0,
  ) {}
}

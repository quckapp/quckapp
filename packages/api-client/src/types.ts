/**
 * Type exports for QuikApp API
 */

import type { components } from './generated/schema';

// =============================================================================
// Schema Types
// =============================================================================

export type Schemas = components['schemas'];

// =============================================================================
// Common Types
// =============================================================================

export type Pagination = Schemas['Pagination'];
export type Timestamp = Schemas['Timestamp'];
export type Error = Schemas['Error'];
export type ErrorDetail = Schemas['ErrorDetail'];
export type ValidationError = Schemas['ValidationError'];

// =============================================================================
// Auth Types
// =============================================================================

export type LoginRequest = Schemas['LoginRequest'];
export type LoginResponse = Schemas['LoginResponse'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type TokenPair = Schemas['TokenPair'];
export type RefreshTokenRequest = Schemas['RefreshTokenRequest'];
export type PasswordResetRequest = Schemas['PasswordResetRequest'];
export type PasswordResetConfirm = Schemas['PasswordResetConfirm'];
export type OAuthRequest = Schemas['OAuthRequest'];
export type MfaSetupResponse = Schemas['MfaSetupResponse'];
export type MfaVerifyRequest = Schemas['MfaVerifyRequest'];
export type Session = Schemas['Session'];

// =============================================================================
// User Types
// =============================================================================

export type User = Schemas['User'];
export type UserProfile = Schemas['UserProfile'];
export type UserStatus = Schemas['UserStatus'];
export type UserPreferences = Schemas['UserPreferences'];
export type UserUpdateRequest = Schemas['UserUpdateRequest'];

// =============================================================================
// Workspace Types
// =============================================================================

export type Workspace = Schemas['Workspace'];
export type WorkspaceSettings = Schemas['WorkspaceSettings'];
export type WorkspaceStats = Schemas['WorkspaceStats'];
export type WorkspaceMember = Schemas['WorkspaceMember'];
export type WorkspaceInvite = Schemas['WorkspaceInvite'];
export type WorkspaceCreateRequest = Schemas['WorkspaceCreateRequest'];
export type WorkspaceUpdateRequest = Schemas['WorkspaceUpdateRequest'];
export type InviteMembersRequest = Schemas['InviteMembersRequest'];

// =============================================================================
// Channel Types
// =============================================================================

export type Channel = Schemas['Channel'];
export type ChannelSettings = Schemas['ChannelSettings'];
export type ChannelMember = Schemas['ChannelMember'];
export type DirectMessage = Schemas['DirectMessage'];
export type GroupDirectMessage = Schemas['GroupDirectMessage'];
export type ChannelCreateRequest = Schemas['ChannelCreateRequest'];
export type ChannelUpdateRequest = Schemas['ChannelUpdateRequest'];
export type AddMembersRequest = Schemas['AddMembersRequest'];

// =============================================================================
// Message Types
// =============================================================================

export type Message = Schemas['Message'];
export type MessagePreview = Schemas['MessagePreview'];
export type MessageBlock = Schemas['MessageBlock'];
export type TextObject = Schemas['TextObject'];
export type BlockElement = Schemas['BlockElement'];
export type SelectOption = Schemas['SelectOption'];
export type Mention = Schemas['Mention'];
export type Reaction = Schemas['Reaction'];
export type MessageCreateRequest = Schemas['MessageCreateRequest'];
export type MessageUpdateRequest = Schemas['MessageUpdateRequest'];
export type ScheduledMessage = Schemas['ScheduledMessage'];
export type ScheduleMessageRequest = Schemas['ScheduleMessageRequest'];
export type ReactionRequest = Schemas['ReactionRequest'];

// =============================================================================
// Thread Types
// =============================================================================

export type Thread = Schemas['Thread'];
export type ThreadSummary = Schemas['ThreadSummary'];
export type ThreadSubscription = Schemas['ThreadSubscription'];
export type ThreadReply = Schemas['ThreadReply'];
export type ThreadListResponse = Schemas['ThreadListResponse'];
export type ThreadRepliesResponse = Schemas['ThreadRepliesResponse'];
export type UpdateThreadRequest = Schemas['UpdateThreadRequest'];
export type SubscribeThreadRequest = Schemas['SubscribeThreadRequest'];

// =============================================================================
// Call Types
// =============================================================================

export type Call = Schemas['Call'];
export type CallParticipant = Schemas['CallParticipant'];
export type CallSettings = Schemas['CallSettings'];
export type CallRecording = Schemas['CallRecording'];
export type CallCreateRequest = Schemas['CallCreateRequest'];
export type CallUpdateRequest = Schemas['CallUpdateRequest'];
export type JoinCallRequest = Schemas['JoinCallRequest'];
export type CallActionRequest = Schemas['CallActionRequest'];
export type ScheduledCall = Schemas['ScheduledCall'];
export type CallRecurrence = Schemas['CallRecurrence'];

// =============================================================================
// Huddle Types
// =============================================================================

export type Huddle = Schemas['Huddle'];
export type HuddleParticipant = Schemas['HuddleParticipant'];
export type HuddleInvite = Schemas['HuddleInvite'];
export type StartHuddleRequest = Schemas['StartHuddleRequest'];
export type JoinHuddleRequest = Schemas['JoinHuddleRequest'];
export type HuddleActionRequest = Schemas['HuddleActionRequest'];
export type UpdateHuddleRequest = Schemas['UpdateHuddleRequest'];
export type HuddleThread = Schemas['HuddleThread'];
export type HuddleNote = Schemas['HuddleNote'];

// =============================================================================
// File Types
// =============================================================================

export type File = Schemas['File'];
export type FileMetadata = Schemas['FileMetadata'];
export type FileAttachment = Schemas['FileAttachment'];
export type FileShare = Schemas['FileShare'];
export type FileUploadRequest = Schemas['FileUploadRequest'];
export type FileUploadResponse = Schemas['FileUploadResponse'];
export type FileUpdateRequest = Schemas['FileUpdateRequest'];
export type ShareFileRequest = Schemas['ShareFileRequest'];
export type ExternalLink = Schemas['ExternalLink'];
export type StorageQuota = Schemas['StorageQuota'];

// =============================================================================
// Notification Types
// =============================================================================

export type Notification = Schemas['Notification'];
export type NotificationData = Schemas['NotificationData'];
export type NotificationAction = Schemas['NotificationAction'];
export type NotificationSettings = Schemas['NotificationSettings'];
export type DesktopNotificationSettings = Schemas['DesktopNotificationSettings'];
export type MobileNotificationSettings = Schemas['MobileNotificationSettings'];
export type EmailNotificationSettings = Schemas['EmailNotificationSettings'];
export type NotificationSchedule = Schemas['NotificationSchedule'];
export type ChannelNotificationSettings = Schemas['ChannelNotificationSettings'];
export type UpdateNotificationSettingsRequest = Schemas['UpdateNotificationSettingsRequest'];
export type MarkNotificationsReadRequest = Schemas['MarkNotificationsReadRequest'];
export type PushSubscription = Schemas['PushSubscription'];
export type DeviceToken = Schemas['DeviceToken'];

// =============================================================================
// Search Types
// =============================================================================

export type SearchRequest = Schemas['SearchRequest'];
export type SearchFilters = Schemas['SearchFilters'];
export type SearchResponse = Schemas['SearchResponse'];
export type SearchResult = Schemas['SearchResult'];
export type SearchHighlight = Schemas['SearchHighlight'];
export type SearchFacets = Schemas['SearchFacets'];
export type FacetBucket = Schemas['FacetBucket'];
export type DateFacetBucket = Schemas['DateFacetBucket'];
export type QuickSearchResponse = Schemas['QuickSearchResponse'];
export type QuickSearchItem = Schemas['QuickSearchItem'];
export type SavedSearch = Schemas['SavedSearch'];
export type CreateSavedSearchRequest = Schemas['CreateSavedSearchRequest'];
export type SearchHistory = Schemas['SearchHistory'];

// =============================================================================
// Presence Types
// =============================================================================

export type Presence = Schemas['Presence'];
export type TypingIndicator = Schemas['TypingIndicator'];
export type BulkPresenceResponse = Schemas['BulkPresenceResponse'];
export type ChannelPresence = Schemas['ChannelPresence'];
export type TypingUser = Schemas['TypingUser'];
export type UpdatePresenceRequest = Schemas['UpdatePresenceRequest'];
export type SetTypingRequest = Schemas['SetTypingRequest'];
export type PresenceSubscription = Schemas['PresenceSubscription'];
export type ActivityStatus = Schemas['ActivityStatus'];
export type DevicePresence = Schemas['DevicePresence'];
export type PresencePreferences = Schemas['PresencePreferences'];

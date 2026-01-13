/**
 * API Services Index
 * Central export for all API services
 */

// Import all API services
import authApi from './auth.api';
import usersApi from './users.api';
import conversationsApi from './conversations.api';
import messagesApi from './messages.api';
import callsApi from './calls.api';
import statusApi from './status.api';
import uploadApi from './upload.api';
import communitiesApi from './communities.api';
import broadcastApi from './broadcast.api';
import starredApi from './starred.api';
import pollsApi from './polls.api';
import scheduledApi from './scheduled.api';
import analyticsApi from './analytics.api';
import healthApi from './health.api';
import exportApi from './export.api';
import linkPreviewApi from './linkPreview.api';
import transcriptionApi from './transcription.api';
import backupApi from './backup.api';

// Export individual services
export {
  authApi,
  usersApi,
  conversationsApi,
  messagesApi,
  callsApi,
  statusApi,
  uploadApi,
  communitiesApi,
  broadcastApi,
  starredApi,
  pollsApi,
  scheduledApi,
  analyticsApi,
  healthApi,
  exportApi,
  linkPreviewApi,
  transcriptionApi,
  backupApi,
};

// Export types
export * from './auth.api';
export * from './users.api';
export * from './conversations.api';
export * from './messages.api';
export * from './calls.api';
export * from './status.api';
export * from './upload.api';
export * from './communities.api';
export * from './broadcast.api';
export * from './starred.api';
export * from './polls.api';
export * from './scheduled.api';
export * from './analytics.api';
export * from './health.api';
export * from './export.api';
export * from './linkPreview.api';
export * from './transcription.api';
export * from './backup.api';

// Combined API object for convenience
const api = {
  auth: authApi,
  users: usersApi,
  conversations: conversationsApi,
  messages: messagesApi,
  calls: callsApi,
  status: statusApi,
  upload: uploadApi,
  communities: communitiesApi,
  broadcast: broadcastApi,
  starred: starredApi,
  polls: pollsApi,
  scheduled: scheduledApi,
  analytics: analyticsApi,
  health: healthApi,
  export: exportApi,
  linkPreview: linkPreviewApi,
  transcription: transcriptionApi,
  backup: backupApi,
};

export default api;

/**
 * Backup API Service
 * Handles backup and restore operations with Google Cloud Storage
 */

import api from '../api';

export interface BackupStatus {
  enabled: boolean;
  gcsConfigured: boolean;
  s3BaseUrl: string;
}

export interface BackupStats {
  messages: number;
  users: number;
  conversations: number;
  mediaFiles: number;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  timestamp: string;
  stats: BackupStats;
  error?: string;
}

export interface BackupListItem {
  backupId: string;
  timestamp: string;
}

export interface BackupDetails {
  backupId: string;
  timestamp: string;
  stats: BackupStats;
  version: string;
  source: string;
}

/**
 * Get backup service status
 */
export const getBackupStatus = async (): Promise<BackupStatus> => {
  const response = await api.get('/backup/status');
  return response.data.data;
};

/**
 * Run full backup (messages, users, conversations, media)
 */
export const runFullBackup = async (): Promise<BackupResult> => {
  const response = await api.post('/backup/run');
  return response.data.data;
};

/**
 * List all available backups
 */
export const listBackups = async (): Promise<BackupListItem[]> => {
  const response = await api.get('/backup/list');
  return response.data.data;
};

/**
 * Get backup details
 */
export const getBackupDetails = async (backupId: string): Promise<BackupDetails | null> => {
  const response = await api.get(`/backup/${backupId}`);
  return response.data.success ? response.data.data : null;
};

/**
 * Backup messages only
 */
export const backupMessages = async (): Promise<{ backupId: string; count: number }> => {
  const response = await api.post('/backup/messages');
  return response.data.data;
};

/**
 * Backup profile photos only
 */
export const backupProfiles = async (): Promise<{
  backupId: string;
  totalFiles: number;
  backedUp: number;
  failed: number;
}> => {
  const response = await api.post('/backup/profiles');
  return response.data.data;
};

/**
 * Backup all media files
 */
export const backupMedia = async (): Promise<{
  backupId: string;
  totalFiles: number;
  backedUp: number;
  failed: number;
}> => {
  const response = await api.post('/backup/media');
  return response.data.data;
};

export default {
  getBackupStatus,
  runFullBackup,
  listBackups,
  getBackupDetails,
  backupMessages,
  backupProfiles,
  backupMedia,
};

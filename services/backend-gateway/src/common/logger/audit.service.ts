import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  TWO_FACTOR_VERIFIED = 'TWO_FACTOR_VERIFIED',
  TWO_FACTOR_FAILED = 'TWO_FACTOR_FAILED',
  OAUTH_LOGIN = 'OAUTH_LOGIN',
  OAUTH_LINK = 'OAUTH_LINK',
  OAUTH_UNLINK = 'OAUTH_UNLINK',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  USER_BLOCKED = 'USER_BLOCKED',
  USER_UNBLOCKED = 'USER_UNBLOCKED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  AVATAR_CHANGED = 'AVATAR_CHANGED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSIONS_CHANGED = 'PERMISSIONS_CHANGED',

  // Content
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  MESSAGE_EDITED = 'MESSAGE_EDITED',
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  CONVERSATION_DELETED = 'CONVERSATION_DELETED',
  PARTICIPANT_ADDED = 'PARTICIPANT_ADDED',
  PARTICIPANT_REMOVED = 'PARTICIPANT_REMOVED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DELETED = 'FILE_DELETED',

  // Security
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  IP_BLOCKED = 'IP_BLOCKED',
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',

  // Data Access
  DATA_EXPORT_REQUESTED = 'DATA_EXPORT_REQUESTED',
  DATA_EXPORT_COMPLETED = 'DATA_EXPORT_COMPLETED',
  DATA_DELETION_REQUESTED = 'DATA_DELETION_REQUESTED',
  DATA_DELETION_COMPLETED = 'DATA_DELETION_COMPLETED',

  // Admin
  ADMIN_ACTION = 'ADMIN_ACTION',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  REPORT_CREATED = 'REPORT_CREATED',
  REPORT_RESOLVED = 'REPORT_RESOLVED',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AuditLogEntry {
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  targetUserId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  requestId?: string;
  sessionId?: string;
}

@Injectable()
export class AuditService {
  constructor(private logger: LoggerService) {}

  /**
   * Log an audit event
   */
  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Determine log level based on severity and success
    const level = this.getLogLevel(entry.severity, entry.success);

    const logMessage = `AUDIT: ${entry.action}`;
    const logMeta = {
      context: 'Audit',
      type: 'audit',
      ...fullEntry,
    };

    switch (level) {
      case 'error':
        this.logger.error(logMessage, logMeta);
        break;
      case 'warn':
        this.logger.warn(logMessage, logMeta);
        break;
      default:
        this.logger.log(logMessage, logMeta);
    }
  }

  // Authentication Events
  loginSuccess(userId: string, ip?: string, userAgent?: string, details?: any): void {
    this.log({
      action: AuditAction.LOGIN_SUCCESS,
      severity: AuditSeverity.LOW,
      userId,
      ip,
      userAgent,
      details,
      success: true,
    });
  }

  loginFailed(identifier: string, ip?: string, userAgent?: string, reason?: string): void {
    this.log({
      action: AuditAction.LOGIN_FAILED,
      severity: AuditSeverity.MEDIUM,
      ip,
      userAgent,
      details: { identifier, reason },
      success: false,
      errorMessage: reason,
    });
  }

  logout(userId: string, ip?: string, sessionId?: string): void {
    this.log({
      action: AuditAction.LOGOUT,
      severity: AuditSeverity.LOW,
      userId,
      ip,
      sessionId,
      success: true,
    });
  }

  register(userId: string, ip?: string, userAgent?: string): void {
    this.log({
      action: AuditAction.REGISTER,
      severity: AuditSeverity.LOW,
      userId,
      ip,
      userAgent,
      success: true,
    });
  }

  passwordChange(userId: string, ip?: string, success: boolean = true): void {
    this.log({
      action: AuditAction.PASSWORD_CHANGE,
      severity: AuditSeverity.MEDIUM,
      userId,
      ip,
      success,
    });
  }

  passwordResetRequest(email: string, ip?: string): void {
    this.log({
      action: AuditAction.PASSWORD_RESET_REQUEST,
      severity: AuditSeverity.MEDIUM,
      ip,
      details: { email: this.maskEmail(email) },
      success: true,
    });
  }

  twoFactorEnabled(userId: string, ip?: string): void {
    this.log({
      action: AuditAction.TWO_FACTOR_ENABLED,
      severity: AuditSeverity.MEDIUM,
      userId,
      ip,
      success: true,
    });
  }

  twoFactorDisabled(userId: string, ip?: string): void {
    this.log({
      action: AuditAction.TWO_FACTOR_DISABLED,
      severity: AuditSeverity.MEDIUM,
      userId,
      ip,
      success: true,
    });
  }

  twoFactorFailed(userId: string, ip?: string): void {
    this.log({
      action: AuditAction.TWO_FACTOR_FAILED,
      severity: AuditSeverity.MEDIUM,
      userId,
      ip,
      success: false,
    });
  }

  oauthLogin(userId: string, provider: string, ip?: string): void {
    this.log({
      action: AuditAction.OAUTH_LOGIN,
      severity: AuditSeverity.LOW,
      userId,
      ip,
      details: { provider },
      success: true,
    });
  }

  // Security Events
  suspiciousActivity(userId: string, ip: string, reason: string, details?: any): void {
    this.log({
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.HIGH,
      userId,
      ip,
      details: { reason, ...details },
      success: false,
    });
  }

  rateLimitExceeded(ip: string, endpoint: string, userId?: string): void {
    this.log({
      action: AuditAction.RATE_LIMIT_EXCEEDED,
      severity: AuditSeverity.MEDIUM,
      userId,
      ip,
      resource: endpoint,
      success: false,
    });
  }

  unauthorizedAccess(ip: string, resource: string, userId?: string, reason?: string): void {
    this.log({
      action: AuditAction.UNAUTHORIZED_ACCESS,
      severity: AuditSeverity.HIGH,
      userId,
      ip,
      resource,
      details: { reason },
      success: false,
    });
  }

  permissionDenied(userId: string, resource: string, action: string, ip?: string): void {
    this.log({
      action: AuditAction.PERMISSION_DENIED,
      severity: AuditSeverity.MEDIUM,
      userId,
      ip,
      resource,
      details: { attemptedAction: action },
      success: false,
    });
  }

  bruteForceDetected(ip: string, targetUserId?: string, attempts?: number): void {
    this.log({
      action: AuditAction.BRUTE_FORCE_DETECTED,
      severity: AuditSeverity.CRITICAL,
      targetUserId,
      ip,
      details: { attempts },
      success: false,
    });
  }

  // User Management Events
  userBanned(adminId: string, targetUserId: string, reason: string, ip?: string): void {
    this.log({
      action: AuditAction.USER_BANNED,
      severity: AuditSeverity.HIGH,
      userId: adminId,
      targetUserId,
      ip,
      details: { reason },
      success: true,
    });
  }

  userUnbanned(adminId: string, targetUserId: string, ip?: string): void {
    this.log({
      action: AuditAction.USER_UNBANNED,
      severity: AuditSeverity.MEDIUM,
      userId: adminId,
      targetUserId,
      ip,
      success: true,
    });
  }

  roleChanged(
    adminId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    ip?: string,
  ): void {
    this.log({
      action: AuditAction.ROLE_CHANGED,
      severity: AuditSeverity.HIGH,
      userId: adminId,
      targetUserId,
      ip,
      details: { oldRole, newRole },
      success: true,
    });
  }

  // Data Events
  dataExportRequested(userId: string, ip?: string): void {
    this.log({
      action: AuditAction.DATA_EXPORT_REQUESTED,
      severity: AuditSeverity.MEDIUM,
      userId,
      ip,
      success: true,
    });
  }

  dataExportCompleted(userId: string, ip?: string): void {
    this.log({
      action: AuditAction.DATA_EXPORT_COMPLETED,
      severity: AuditSeverity.MEDIUM,
      userId,
      ip,
      success: true,
    });
  }

  // Admin Events
  adminAction(adminId: string, action: string, details: any, ip?: string): void {
    this.log({
      action: AuditAction.ADMIN_ACTION,
      severity: AuditSeverity.MEDIUM,
      userId: adminId,
      ip,
      details: { action, ...details },
      success: true,
    });
  }

  // Helper methods
  private getLogLevel(severity: AuditSeverity, success: boolean): 'info' | 'warn' | 'error' {
    if (!success && severity === AuditSeverity.CRITICAL) {
      return 'error';
    }
    if (!success && severity === AuditSeverity.HIGH) {
      return 'error';
    }
    if (!success) {
      return 'warn';
    }
    if (severity === AuditSeverity.HIGH || severity === AuditSeverity.CRITICAL) {
      return 'warn';
    }
    return 'info';
  }

  private maskEmail(email: string): string {
    if (!email) {
      return '';
    }
    const [local, domain] = email.split('@');
    if (!domain) {
      return email;
    }
    const maskedLocal =
      local.length > 2
        ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
        : '*'.repeat(local.length);
    return `${maskedLocal}@${domain}`;
  }
}

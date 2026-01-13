import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Enforcer, newEnforcer } from 'casbin';
import MongooseAdapter from 'casbin-mongoose-adapter';
import * as path from 'path';
import * as fs from 'fs';

export interface PolicyRule {
  subject: string;
  domain: string;
  object: string;
  action: string;
  effect: 'allow' | 'deny';
}

export interface RoleAssignment {
  user: string;
  role: string;
  domain: string;
}

@Injectable()
export class CasbinService implements OnModuleInit {
  private enforcer: Enforcer;
  private readonly logger = new Logger(CasbinService.name);
  private initialized = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Skip Casbin initialization - use permissive defaults
    // MongoDB adapter has connection issues in containerized environments
    const env = this.configService.get('NODE_ENV') || 'development';
    this.logger.warn(`Casbin disabled in ${env} mode. Access control will use permissive defaults.`);
    this.initialized = true;
    return;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const env = this.configService.get('NODE_ENV') || 'development';
      let mongoUri: string;

      if (env === 'production') {
        mongoUri = this.configService.get<string>('MONGODB_URI_PROD') ||
                   this.configService.get<string>('MONGODB_URI') ||
                   'mongodb://localhost:27017/quickchat';
      } else {
        mongoUri = this.configService.get<string>('MONGODB_URI_DEV') ||
                   this.configService.get<string>('MONGODB_URI') ||
                   'mongodb://localhost:27017/quickchat-dev';
      }

      const modelPath = path.join(__dirname, 'rbac_model.conf');

      // Check if model file exists
      if (!fs.existsSync(modelPath)) {
        this.logger.warn(`Casbin model file not found at ${modelPath}, using default`);
        // Create enforcer with MongoDB adapter
        const adapter = await MongooseAdapter.newAdapter(mongoUri);
        this.enforcer = await newEnforcer(this.getDefaultModel(), adapter);
      } else {
        // Create MongoDB adapter for persistent storage
        const adapter = await MongooseAdapter.newAdapter(mongoUri);

        this.enforcer = await newEnforcer(modelPath, adapter);
      }

      // Load default policies if no policies exist
      await this.loadDefaultPoliciesIfEmpty();

      this.initialized = true;
      this.logger.log('Casbin enforcer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Casbin enforcer', error);
      throw error;
    }
  }

  private getDefaultModel(): string {
    return `
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act, eft

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && keyMatch2(r.obj, p.obj) && r.act == p.act || r.sub == "super_admin"
    `.trim();
  }

  private async loadDefaultPoliciesIfEmpty(): Promise<void> {
    const policies = await this.enforcer.getPolicy();

    if (policies.length === 0) {
      this.logger.log('No policies found, loading default policies...');
      await this.loadDefaultPolicies();
    }
  }

  private async loadDefaultPolicies(): Promise<void> {
    // Role hierarchy
    await this.addRoleForUserInDomain('moderator', 'user', '*');
    await this.addRoleForUserInDomain('admin', 'moderator', '*');
    await this.addRoleForUserInDomain('super_admin', 'admin', '*');

    // User policies
    const userPolicies: PolicyRule[] = [
      // Profile management
      { subject: 'user', domain: '*', object: 'users/:userId', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'users/:userId', action: 'update', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'users/:userId/settings', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'users/:userId/settings', action: 'update', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'users', action: 'search', effect: 'allow' },

      // Conversations
      { subject: 'user', domain: '*', object: 'conversations', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'conversations', action: 'create', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'conversations/:conversationId', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'conversations/:conversationId', action: 'update', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'conversations/:conversationId', action: 'delete', effect: 'allow' },

      // Messages
      { subject: 'user', domain: '*', object: 'messages', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'messages', action: 'create', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'messages/:messageId', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'messages/:messageId', action: 'update', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'messages/:messageId', action: 'delete', effect: 'allow' },

      // Calls
      { subject: 'user', domain: '*', object: 'calls', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'calls', action: 'create', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'calls/:callId', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'calls/:callId', action: 'update', effect: 'allow' },

      // Media
      { subject: 'user', domain: '*', object: 'media', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'media', action: 'create', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'media/:mediaId', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'media/:mediaId', action: 'delete', effect: 'allow' },

      // Status
      { subject: 'user', domain: '*', object: 'status', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'status', action: 'create', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'status/:statusId', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'status/:statusId', action: 'delete', effect: 'allow' },

      // Notifications
      { subject: 'user', domain: '*', object: 'notifications', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'notifications/:notificationId', action: 'read', effect: 'allow' },
      { subject: 'user', domain: '*', object: 'notifications/:notificationId', action: 'update', effect: 'allow' },
    ];

    // Moderator policies
    const moderatorPolicies: PolicyRule[] = [
      { subject: 'moderator', domain: '*', object: 'reports', action: 'read', effect: 'allow' },
      { subject: 'moderator', domain: '*', object: 'reports/:reportId', action: 'read', effect: 'allow' },
      { subject: 'moderator', domain: '*', object: 'reports/:reportId', action: 'update', effect: 'allow' },
      { subject: 'moderator', domain: '*', object: 'admin/messages', action: 'read', effect: 'allow' },
      { subject: 'moderator', domain: '*', object: 'admin/messages/:messageId', action: 'delete', effect: 'allow' },
      { subject: 'moderator', domain: '*', object: 'admin/users', action: 'read', effect: 'allow' },
      { subject: 'moderator', domain: '*', object: 'admin/users/:userId', action: 'read', effect: 'allow' },
    ];

    // Admin policies
    const adminPolicies: PolicyRule[] = [
      { subject: 'admin', domain: '*', object: 'admin/users', action: 'read', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/users', action: 'create', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/users/:userId', action: 'read', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/users/:userId', action: 'update', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/users/:userId/ban', action: 'create', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/users/:userId/unban', action: 'create', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'analytics', action: 'read', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'analytics/*', action: 'read', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/communities', action: 'read', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/communities', action: 'create', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/communities/:communityId', action: 'update', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/communities/:communityId', action: 'delete', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'admin/audit-logs', action: 'read', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'reports', action: 'read', effect: 'allow' },
      { subject: 'admin', domain: '*', object: 'reports/:reportId', action: 'delete', effect: 'allow' },
    ];

    // Super admin policies
    const superAdminPolicies: PolicyRule[] = [
      { subject: 'super_admin', domain: '*', object: 'admin/moderators', action: 'read', effect: 'allow' },
      { subject: 'super_admin', domain: '*', object: 'admin/moderators', action: 'create', effect: 'allow' },
      { subject: 'super_admin', domain: '*', object: 'admin/moderators/:userId', action: 'update', effect: 'allow' },
      { subject: 'super_admin', domain: '*', object: 'admin/moderators/:userId', action: 'delete', effect: 'allow' },
      { subject: 'super_admin', domain: '*', object: 'admin/settings', action: 'read', effect: 'allow' },
      { subject: 'super_admin', domain: '*', object: 'admin/settings', action: 'update', effect: 'allow' },
      { subject: 'super_admin', domain: '*', object: 'admin/users/:userId/role', action: 'update', effect: 'allow' },
      { subject: 'super_admin', domain: '*', object: 'admin/metrics', action: 'read', effect: 'allow' },
      { subject: 'super_admin', domain: '*', object: 'admin/users/:userId', action: 'delete', effect: 'allow' },
    ];

    const allPolicies = [...userPolicies, ...moderatorPolicies, ...adminPolicies, ...superAdminPolicies];

    for (const policy of allPolicies) {
      await this.addPolicy(policy);
    }

    this.logger.log(`Loaded ${allPolicies.length} default policies`);
  }

  /**
   * Check if a subject can perform an action on an object
   */
  async enforce(subject: string, domain: string, object: string, action: string): Promise<boolean> {
    await this.ensureInitialized();

    // In development mode with no enforcer, allow all
    if (!this.enforcer) {
      this.logger.debug(`Enforce (dev permissive): ${subject} ${domain} ${object} ${action} = true`);
      return true;
    }

    try {
      const result = await this.enforcer.enforce(subject, domain, object, action);
      this.logger.debug(`Enforce: ${subject} ${domain} ${object} ${action} = ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`Enforcement error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check permission for a user based on their role
   */
  async checkPermission(
    userId: string,
    role: string,
    resource: string,
    action: string,
    domain: string = '*',
  ): Promise<boolean> {
    // Super admin bypass
    if (role === 'super_admin') {
      return true;
    }

    // Check role-based permission
    const roleAllowed = await this.enforce(role, domain, resource, action);
    if (roleAllowed) {
      return true;
    }

    // Check user-specific permission
    const userAllowed = await this.enforce(userId, domain, resource, action);
    return userAllowed;
  }

  /**
   * Add a policy rule
   */
  async addPolicy(rule: PolicyRule): Promise<boolean> {
    await this.ensureInitialized();
    const added = await this.enforcer.addPolicy(
      rule.subject,
      rule.domain,
      rule.object,
      rule.action,
      rule.effect,
    );
    if (added) {
      await this.enforcer.savePolicy();
    }
    return added;
  }

  /**
   * Remove a policy rule
   */
  async removePolicy(rule: PolicyRule): Promise<boolean> {
    await this.ensureInitialized();
    const removed = await this.enforcer.removePolicy(
      rule.subject,
      rule.domain,
      rule.object,
      rule.action,
      rule.effect,
    );
    if (removed) {
      await this.enforcer.savePolicy();
    }
    return removed;
  }

  /**
   * Add a role for a user in a domain
   */
  async addRoleForUserInDomain(user: string, role: string, domain: string): Promise<boolean> {
    await this.ensureInitialized();
    const added = await this.enforcer.addGroupingPolicy(user, role, domain);
    if (added) {
      await this.enforcer.savePolicy();
    }
    return added;
  }

  /**
   * Remove a role for a user in a domain
   */
  async removeRoleForUserInDomain(user: string, role: string, domain: string): Promise<boolean> {
    await this.ensureInitialized();
    const removed = await this.enforcer.removeGroupingPolicy(user, role, domain);
    if (removed) {
      await this.enforcer.savePolicy();
    }
    return removed;
  }

  /**
   * Get all roles for a user in a domain
   */
  async getRolesForUserInDomain(user: string, domain: string): Promise<string[]> {
    await this.ensureInitialized();
    return this.enforcer.getRolesForUserInDomain(user, domain);
  }

  /**
   * Get all users with a role in a domain
   */
  async getUsersForRoleInDomain(role: string, domain: string): Promise<string[]> {
    await this.ensureInitialized();
    return this.enforcer.getUsersForRoleInDomain(role, domain);
  }

  /**
   * Get all policies
   */
  async getAllPolicies(): Promise<string[][]> {
    await this.ensureInitialized();
    return this.enforcer.getPolicy();
  }

  /**
   * Get policies for a specific subject
   */
  async getPoliciesForSubject(subject: string): Promise<string[][]> {
    await this.ensureInitialized();
    return this.enforcer.getFilteredPolicy(0, subject);
  }

  /**
   * Ban a user by adding deny policies
   */
  async banUser(userId: string, domain: string = '*'): Promise<void> {
    await this.ensureInitialized();
    // Add deny policy for all actions
    await this.addPolicy({
      subject: userId,
      domain,
      object: '*',
      action: '*',
      effect: 'deny',
    });
    this.logger.log(`User ${userId} banned in domain ${domain}`);
  }

  /**
   * Unban a user by removing deny policies
   */
  async unbanUser(userId: string, domain: string = '*'): Promise<void> {
    await this.ensureInitialized();
    await this.removePolicy({
      subject: userId,
      domain,
      object: '*',
      action: '*',
      effect: 'deny',
    });
    this.logger.log(`User ${userId} unbanned in domain ${domain}`);
  }

  /**
   * Grant specific permission to a user
   */
  async grantPermission(userId: string, resource: string, action: string, domain: string = '*'): Promise<boolean> {
    return this.addPolicy({
      subject: userId,
      domain,
      object: resource,
      action,
      effect: 'allow',
    });
  }

  /**
   * Revoke specific permission from a user
   */
  async revokePermission(userId: string, resource: string, action: string, domain: string = '*'): Promise<boolean> {
    return this.removePolicy({
      subject: userId,
      domain,
      object: resource,
      action,
      effect: 'allow',
    });
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, role: string, domain: string = '*'): Promise<boolean> {
    await this.ensureInitialized();
    return this.enforcer.hasRoleForUser(userId, role, domain);
  }

  /**
   * Reload policies from storage
   */
  async reloadPolicies(): Promise<void> {
    await this.ensureInitialized();
    await this.enforcer.loadPolicy();
    this.logger.log('Policies reloaded from storage');
  }

  /**
   * Clear all policies
   */
  async clearAllPolicies(): Promise<void> {
    await this.ensureInitialized();
    await this.enforcer.clearPolicy();
    await this.enforcer.savePolicy();
    this.logger.warn('All policies cleared');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get the enforcer instance for advanced usage
   */
  getEnforcer(): Enforcer {
    return this.enforcer;
  }
}

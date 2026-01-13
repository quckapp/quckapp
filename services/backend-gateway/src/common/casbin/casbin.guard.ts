import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CasbinService } from './casbin.service';
import {
  POLICY_KEY,
  PolicyDefinition,
  RESOURCE_KEY,
  ACTION_KEY,
  SKIP_CASBIN_KEY,
} from './casbin.decorators';

@Injectable()
export class CasbinGuard implements CanActivate {
  private readonly logger = new Logger(CasbinGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly casbinService: CasbinService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if casbin check should be skipped
    const skipCasbin = this.reflector.getAllAndOverride<boolean>(SKIP_CASBIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCasbin) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.isBanned) {
      throw new ForbiddenException('User account is banned');
    }

    // Get policy definition from decorator
    const policyDef = this.reflector.getAllAndOverride<PolicyDefinition>(POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get resource and action from decorators
    const resourceFromDecorator = this.reflector.getAllAndOverride<string>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const actionFromDecorator = this.reflector.getAllAndOverride<string>(ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Determine resource and action
    let resource: string;
    let action: string;
    let domain = '*';

    if (policyDef) {
      resource = policyDef.resource;
      action = policyDef.action;
      domain = policyDef.domain || '*';
    } else if (resourceFromDecorator && actionFromDecorator) {
      resource = resourceFromDecorator;
      action = actionFromDecorator;
    } else {
      // Auto-derive from route if no decorator provided
      resource = this.deriveResourceFromRoute(request);
      action = this.deriveActionFromMethod(request.method);
    }

    // Replace route params in resource string
    resource = this.replaceRouteParams(resource, request.params);

    const userId = user._id?.toString() || user.id?.toString();
    const role = user.role || 'user';

    // Check permission
    const allowed = await this.casbinService.checkPermission(
      userId,
      role,
      resource,
      action,
      domain,
    );

    if (!allowed) {
      this.logger.warn(
        `Access denied: User ${userId} (${role}) tried to ${action} on ${resource}`,
      );
      throw new ForbiddenException(
        `You don't have permission to ${action} this resource`,
      );
    }

    this.logger.debug(
      `Access granted: User ${userId} (${role}) - ${action} on ${resource}`,
    );

    return true;
  }

  private deriveResourceFromRoute(request: any): string {
    // Get the route path pattern (e.g., /users/:id)
    const routePath = request.route?.path || request.path;

    // Remove leading slash and version prefix
    let resource = routePath.replace(/^\/?(api\/)?v?\d*\/?/, '');

    // Convert express params to casbin pattern
    // :id -> :userId, :messageId, etc.
    resource = resource.replace(/:(\w+)/g, ':$1');

    return resource;
  }

  private deriveActionFromMethod(method: string): string {
    const methodToAction: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    return methodToAction[method.toUpperCase()] || 'read';
  }

  private replaceRouteParams(resource: string, params: Record<string, string>): string {
    let result = resource;

    for (const [key, value] of Object.entries(params || {})) {
      // Replace :param with :param (keeping the pattern for casbin matching)
      // This allows the policy to match any ID value
      result = result.replace(`:${key}`, `:${key}`);
    }

    return result;
  }
}

/**
 * Extended guard that also checks resource ownership
 * Use this for endpoints where users should only access their own resources
 */
@Injectable()
export class CasbinOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(CasbinOwnershipGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly casbinService: CasbinService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.isBanned) {
      throw new ForbiddenException('User account is banned');
    }

    const userId = user._id?.toString() || user.id?.toString();
    const role = user.role || 'user';

    // Super admin can access everything
    if (role === 'super_admin') {
      return true;
    }

    // Get ownership field from decorator (default: 'userId')
    const ownershipField = this.reflector.get<string>('ownershipField', context.getHandler()) || 'userId';

    // Check if the resource belongs to the user
    const resourceOwnerId = request.params[ownershipField] || request.body?.[ownershipField];

    if (resourceOwnerId && resourceOwnerId !== userId) {
      // User is trying to access someone else's resource
      // Check if they have admin/moderator permissions
      const policyDef = this.reflector.getAllAndOverride<PolicyDefinition>(POLICY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (policyDef) {
        const allowed = await this.casbinService.checkPermission(
          userId,
          role,
          policyDef.resource,
          policyDef.action,
          policyDef.domain || '*',
        );

        if (!allowed) {
          this.logger.warn(
            `Ownership violation: User ${userId} tried to access resource owned by ${resourceOwnerId}`,
          );
          throw new ForbiddenException('You can only access your own resources');
        }
      } else {
        // No specific policy, deny access to other users' resources
        throw new ForbiddenException('You can only access your own resources');
      }
    }

    return true;
  }
}

/**
 * Guard for checking specific permissions without route-based derivation
 * Useful for custom business logic checks
 */
@Injectable()
export class CasbinPermissionGuard implements CanActivate {
  private readonly logger = new Logger(CasbinPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly casbinService: CasbinService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.isBanned) {
      throw new ForbiddenException('User account is banned');
    }

    // Get required permission from decorator
    const policyDef = this.reflector.getAllAndOverride<PolicyDefinition>(POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policyDef) {
      // No policy defined, allow access (or deny based on your preference)
      return true;
    }

    const userId = user._id?.toString() || user.id?.toString();
    const role = user.role || 'user';

    const allowed = await this.casbinService.checkPermission(
      userId,
      role,
      policyDef.resource,
      policyDef.action,
      policyDef.domain || '*',
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Permission denied: ${policyDef.action} on ${policyDef.resource}`,
      );
    }

    return true;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.isBanned) {
      throw new ForbiddenException('User account is banned');
    }

    const adminRoles = ['admin', 'super_admin', 'moderator'];
    if (!adminRoles.includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}

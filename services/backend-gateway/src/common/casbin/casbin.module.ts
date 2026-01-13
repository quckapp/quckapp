import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CasbinService } from './casbin.service';
import { CasbinGuard, CasbinOwnershipGuard, CasbinPermissionGuard } from './casbin.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CasbinService,
    CasbinGuard,
    CasbinOwnershipGuard,
    CasbinPermissionGuard,
  ],
  exports: [
    CasbinService,
    CasbinGuard,
    CasbinOwnershipGuard,
    CasbinPermissionGuard,
  ],
})
export class CasbinModule {}

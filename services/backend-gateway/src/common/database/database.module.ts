import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../modules/users/schemas/user.schema';
import { UserRepository } from './repository/user.repository';

/**
 * Database Module
 * Provides repository pattern implementation and database utilities
 *
 * This module exports repositories that can be injected into services
 * to abstract data access logic from business logic.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly userRepository: UserRepository) {}
 *
 *   async findUser(id: string) {
 *     return this.userRepository.findById(id);
 *   }
 * }
 * ```
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [UserRepository],
  exports: [UserRepository, MongooseModule],
})
export class DatabaseModule {}

/**
 * Huddle Module - Module Organization Pattern
 * SOLID: Single Responsibility - configures huddle feature
 * Dependency Injection: Registers all providers
 */

import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Huddle, HuddleSchema } from './schemas/huddle.schema';
import { HuddleController } from './huddle.controller';
import { HuddleService } from './huddle.service';
import { HuddleGateway } from './huddle.gateway';
import { HuddleRepository } from './repositories/huddle.repository';
import { HuddleFactory } from './factories/huddle.factory';
import { HuddleCreationService } from './services/huddle-creation.service';
import { HuddleParticipantService } from './services/huddle-participant.service';
import { HuddleQueryService } from './services/huddle-query.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Huddle.name, schema: HuddleSchema }]),
    JwtModule.register({}),
    ConfigModule,
    forwardRef(() => MessagesModule),
  ],
  controllers: [HuddleController],
  providers: [
    // Main Service (Facade)
    HuddleService,

    // Specialized Services (SRP)
    HuddleCreationService,
    HuddleParticipantService,
    HuddleQueryService,

    // Repository Pattern
    HuddleRepository,

    // Factory Pattern
    HuddleFactory,

    // WebSocket Gateway
    HuddleGateway,
  ],
  exports: [HuddleService],
})
export class HuddleModule {}

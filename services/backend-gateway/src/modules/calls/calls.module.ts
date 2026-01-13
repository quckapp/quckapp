import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { Call, CallSchema } from './schemas/call.schema';
import { MessagesModule } from '../messages/messages.module';
import { GatewaysModule } from '../../gateways/gateways.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Call.name, schema: CallSchema }]),
    forwardRef(() => MessagesModule),
    forwardRef(() => GatewaysModule),
    UsersModule,
  ],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}

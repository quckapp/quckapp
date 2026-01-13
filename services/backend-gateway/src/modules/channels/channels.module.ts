import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelsController, ChannelsDirectController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { ChannelMember, ChannelMemberSchema } from './schemas/channel-member.schema';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: ChannelMember.name, schema: ChannelMemberSchema },
    ]),
    forwardRef(() => WorkspacesModule),
  ],
  controllers: [ChannelsController, ChannelsDirectController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}

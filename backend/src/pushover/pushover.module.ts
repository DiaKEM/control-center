import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminSettingsModule } from '../admin/admin-settings.module';
import { PushoverService } from './pushover.service';

@Module({
  imports: [ConfigModule, AdminSettingsModule],
  providers: [PushoverService],
  exports: [PushoverService],
})
export class PushoverModule {}

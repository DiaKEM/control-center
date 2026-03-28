import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminSettingsModule } from '../admin/admin-settings.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [ConfigModule, AdminSettingsModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}

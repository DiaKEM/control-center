import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminSettingsModule } from '../admin/admin-settings.module';
import { NightscoutService } from './nightscout.service';

@Module({
  imports: [ConfigModule, AdminSettingsModule],
  providers: [NightscoutService],
  exports: [NightscoutService],
})
export class NightscoutModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NightscoutModule } from '../nightscout/nightscout.module';
import { PushoverModule } from '../pushover/pushover.module';
import { TelegramModule } from '../telegram/telegram.module';
import { JobExecutionModule } from '../job-execution/job-execution.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { AdminSettingsModule } from './admin-settings.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    ConfigModule,
    AdminSettingsModule,
    NightscoutModule,
    PushoverModule,
    TelegramModule,
    JobExecutionModule,
    SchedulerModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}

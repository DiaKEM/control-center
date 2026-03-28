import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobManagerModule } from '../job-manager/job-manager.module';
import { AdminSettingsModule } from '../admin/admin-settings.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), JobManagerModule, AdminSettingsModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}

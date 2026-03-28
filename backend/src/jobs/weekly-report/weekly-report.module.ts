import { Module } from '@nestjs/common';
import { JobExecutionModule } from '../../job-execution/job-execution.module';
import { GlucoseReportModule } from '../../glucose-report/glucose-report.module';
import { JobConfigurationModule } from '../../job-configuration/job-configuration.module';
import { NotificationManagerModule } from '../../notification-manager/notification-manager.module';
import { WeeklyReportJob } from './weekly-report.job';

@Module({
  imports: [JobExecutionModule, GlucoseReportModule, JobConfigurationModule, NotificationManagerModule],
  providers: [WeeklyReportJob],
  exports: [WeeklyReportJob],
})
export class WeeklyReportModule {}

import { Module } from '@nestjs/common';
import { JobExecutionModule } from '../../job-execution/job-execution.module';
import { GlucoseReportModule } from '../../glucose-report/glucose-report.module';
import { JobConfigurationModule } from '../../job-configuration/job-configuration.module';
import { DayReportJob } from './day-report.job';

@Module({
  imports: [JobExecutionModule, GlucoseReportModule, JobConfigurationModule],
  providers: [DayReportJob],
  exports: [DayReportJob],
})
export class DayReportModule {}

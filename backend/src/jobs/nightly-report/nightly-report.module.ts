import { Module } from '@nestjs/common';
import { JobExecutionModule } from '../../job-execution/job-execution.module';
import { GlucoseReportModule } from '../../glucose-report/glucose-report.module';
import { JobConfigurationModule } from '../../job-configuration/job-configuration.module';
import { NightlyReportJob } from './nightly-report.job';

@Module({
  imports: [JobExecutionModule, GlucoseReportModule, JobConfigurationModule],
  providers: [NightlyReportJob],
  exports: [NightlyReportJob],
})
export class NightlyReportModule {}

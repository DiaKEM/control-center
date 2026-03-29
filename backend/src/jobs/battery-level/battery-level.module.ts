import { Module } from '@nestjs/common';
import { JobConfigurationModule } from '../../job-configuration/job-configuration.module';
import { JobExecutionModule } from '../../job-execution/job-execution.module';
import { NightscoutModule } from '../../nightscout/nightscout.module';
import { GlucoseReportModule } from '../../glucose-report/glucose-report.module';
import { BatteryLevelJob } from './battery-level.job';

@Module({
  imports: [NightscoutModule, JobConfigurationModule, JobExecutionModule, GlucoseReportModule],
  providers: [BatteryLevelJob],
  exports: [BatteryLevelJob],
})
export class BatteryLevelModule {}

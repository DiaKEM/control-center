import { Module } from '@nestjs/common';
import { JobConfigurationModule } from '../../job-configuration/job-configuration.module';
import { JobExecutionModule } from '../../job-execution/job-execution.module';
import { NightscoutModule } from '../../nightscout/nightscout.module';
import { SensorAgeJob } from './sensor-age.job';

@Module({
  imports: [NightscoutModule, JobConfigurationModule, JobExecutionModule],
  providers: [SensorAgeJob],
  exports: [SensorAgeJob],
})
export class SensorAgeModule {}

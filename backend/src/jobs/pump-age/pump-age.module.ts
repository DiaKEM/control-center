import { Module } from '@nestjs/common';
import { JobConfigurationModule } from '../../job-configuration/job-configuration.module';
import { JobExecutionModule } from '../../job-execution/job-execution.module';
import { NightscoutModule } from '../../nightscout/nightscout.module';
import { PumpAgeJob } from './pump-age.job';

@Module({
  imports: [NightscoutModule, JobConfigurationModule, JobExecutionModule],
  providers: [PumpAgeJob],
  exports: [PumpAgeJob],
})
export class PumpAgeModule {}

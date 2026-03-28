import { Module } from '@nestjs/common';
import { JobConfigurationModule } from '../../job-configuration/job-configuration.module';
import { JobExecutionModule } from '../../job-execution/job-execution.module';
import { NightscoutModule } from '../../nightscout/nightscout.module';
import { PumpOcclusionJob } from './pump-occlusion.job';

@Module({
  imports: [NightscoutModule, JobConfigurationModule, JobExecutionModule],
  providers: [PumpOcclusionJob],
  exports: [PumpOcclusionJob],
})
export class PumpOcclusionModule {}

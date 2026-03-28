import { Module } from '@nestjs/common';
import { JobConfigurationModule } from '../../job-configuration/job-configuration.module';
import { JobExecutionModule } from '../../job-execution/job-execution.module';
import { NightscoutModule } from '../../nightscout/nightscout.module';
import { InsulinLevelJob } from './insulin-level.job';

@Module({
  imports: [NightscoutModule, JobConfigurationModule, JobExecutionModule],
  providers: [InsulinLevelJob],
  exports: [InsulinLevelJob],
})
export class InsulinLevelModule {}

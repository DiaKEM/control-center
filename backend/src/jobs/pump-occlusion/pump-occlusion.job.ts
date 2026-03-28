import { Injectable } from '@nestjs/common';
import { JobConfigurationService } from '../../job-configuration/job-configuration.service';
import { JobExecutionContext } from '../../job-execution/job-execution.context';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import { NightscoutService } from '../../nightscout/nightscout.service';
import { JobType } from '../../job-type/job-type.decorator';
import { JobTypeBase } from '../../job-type/job-type-base';

export const PUMP_OCCLUSION_JOB_KEY = 'pump-occlusion';

@Injectable()
@JobType(PUMP_OCCLUSION_JOB_KEY)
export class PumpOcclusionJob extends JobTypeBase {
  /* c8 ignore start */
  constructor(
    private readonly nightscout: NightscoutService,
    private readonly jobConfigService: JobConfigurationService,
    private readonly jobExecutionService: JobExecutionService,
  ) {
    super();
  }
  /* c8 ignore stop */

  async execute(): Promise<JobExecutionContext> {
    const ctx = await this.jobExecutionService.create(PUMP_OCCLUSION_JOB_KEY);
    try {
      const occlusionDetected = await this.nightscout.getLatestPumpOcclusion();

      await ctx.setCurrentValue(String(!occlusionDetected));

      if (!occlusionDetected) {
        await ctx.info('No pump occlusion detected — no action needed');
        await ctx.complete();
        return ctx;
      }

      await ctx.warn('Pump occlusion detected — notification required');

      const config = await this.jobConfigService.findFirst(
        PUMP_OCCLUSION_JOB_KEY,
      );
      if (!config) {
        await ctx.warn(
          'No job configuration found for pump-occlusion — skipping notification',
        );
        await ctx.complete();
        return ctx;
      }

      await ctx.setJobConfiguration(config);
      await ctx.needsNotification({
        title: 'Pump occlusion alarm!',
        message: 'A pump occlusion has been detected',
        priority: config.priority,
      });
      await ctx.complete();
    } catch (err: unknown) {
      await ctx.error(err?.toString() || 'Unknown error');
      await ctx.fail();
    }

    return ctx;
  }
}

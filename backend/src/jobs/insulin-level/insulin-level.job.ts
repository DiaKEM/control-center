import { Injectable } from '@nestjs/common';
import { JobConfigurationService } from '../../job-configuration/job-configuration.service';
import { JobExecutionContext } from '../../job-execution/job-execution.context';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import { NightscoutService } from '../../nightscout/nightscout.service';
import { JobType } from '../../job-type/job-type.decorator';
import { JobTypeBase } from '../../job-type/job-type-base';

export const INSULIN_LEVEL_JOB_KEY = 'insulin-level';

@Injectable()
@JobType(INSULIN_LEVEL_JOB_KEY)
export class InsulinLevelJob extends JobTypeBase {
  constructor(
    private readonly nightscout: NightscoutService,
    private readonly jobConfigService: JobConfigurationService,
    private readonly jobExecutionService: JobExecutionService,
  ) {
    super();
  }

  async execute(): Promise<JobExecutionContext> {
    const ctx = await this.jobExecutionService.create(INSULIN_LEVEL_JOB_KEY);
    try {
      const insulin = await this.nightscout.getLatestInsulinLevel();
      if (insulin === null) {
        await ctx.warn('No insulin level found in Nightscout device status');
        await ctx.skipped();
        return ctx;
      }

      await ctx.setCurrentValue(insulin.toFixed(1));

      const config = await this.jobConfigService.findNextHigher(
        INSULIN_LEVEL_JOB_KEY,
        insulin,
      );
      if (config) await ctx.setJobConfiguration(config);

      if (!config) {
        await ctx.info(
          `Insulin level ${insulin.toFixed(1)}U is above all configured thresholds — no action needed`,
        );
        await ctx.complete();
        return ctx;
      }

      await ctx.warn(
        `Insulin level ${insulin.toFixed(1)}U is at or below threshold ${config.threshold}U — notification required`,
      );

      await ctx.needsNotification({
        title: 'Low insulin warning!',
        message: `Insulin reservoir is at ${insulin.toFixed(1)}U`,
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

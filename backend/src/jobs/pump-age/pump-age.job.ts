import { Injectable } from '@nestjs/common';
import { JobConfigurationService } from '../../job-configuration/job-configuration.service';
import { JobExecutionContext } from '../../job-execution/job-execution.context';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import { NightscoutService } from '../../nightscout/nightscout.service';
import { JobType } from '../../job-type/job-type.decorator';
import { JobTypeBase } from '../../job-type/job-type-base';

export const PUMP_AGE_JOB_KEY = 'pump-age';

@Injectable()
@JobType(PUMP_AGE_JOB_KEY)
export class PumpAgeJob extends JobTypeBase {
  constructor(
    private readonly nightscout: NightscoutService,
    private readonly jobConfigService: JobConfigurationService,
    private readonly jobExecutionService: JobExecutionService,
  ) {
    super();
  }

  async execute(): Promise<JobExecutionContext> {
    const ctx = await this.jobExecutionService.create(PUMP_AGE_JOB_KEY);
    try {
      const treatment = await this.nightscout.getLastPumpChange();
      if (!treatment) {
        await ctx.warn('No pump change found in Nightscout');
        await ctx.skipped();
        return ctx;
      }

      const { elapsedDays: pumpAge } = treatment;
      if (pumpAge === undefined) {
        await ctx.warn('Pump change has no elapsed days');
        await ctx.skipped();
        return ctx;
      }

      await ctx.setCurrentValue(pumpAge.toFixed(2));

      const config = await this.jobConfigService.findNextLower(
        PUMP_AGE_JOB_KEY,
        pumpAge,
      );
      if (config) await ctx.setJobConfiguration(config);

      if (!config) {
        await ctx.info(
          `No configuration matches pump age ${pumpAge.toFixed(2)}d`,
        );
        await ctx.complete();
        return ctx;
      }

      const age = `${pumpAge.toFixed(2)}d`;
      const thr = `${config.threshold}d`;
      await ctx.info(`Pump age: ${age} (threshold: ${thr})`);

      if (pumpAge >= config.threshold) {
        await ctx.warn(
          `Pump age ${age} exceeds threshold ${thr} — notification required`,
        );
      } else {
        await ctx.info(
          `Pump age ${age} is below threshold ${thr} — no action needed`,
        );
      }

      await ctx.needsNotification({
        title: 'Pump age alarm!',
        message: `Pump is currently ${age} old`,
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

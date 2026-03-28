import { Injectable } from '@nestjs/common';
import { JobConfigurationService } from '../../job-configuration/job-configuration.service';
import { JobExecutionContext } from '../../job-execution/job-execution.context';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import { NightscoutService } from '../../nightscout/nightscout.service';
import { JobType } from '../../job-type/job-type.decorator';
import { JobTypeBase } from '../../job-type/job-type-base';

export const BATTERY_LEVEL_JOB_KEY = 'battery-level';

@Injectable()
@JobType(BATTERY_LEVEL_JOB_KEY)
export class BatteryLevelJob extends JobTypeBase {
  constructor(
    private readonly nightscout: NightscoutService,
    private readonly jobConfigService: JobConfigurationService,
    private readonly jobExecutionService: JobExecutionService,
  ) {
    super();
  }

  async execute(): Promise<JobExecutionContext> {
    const ctx = await this.jobExecutionService.create(BATTERY_LEVEL_JOB_KEY);
    try {
      const battery = await this.nightscout.getLatestBatteryLevel();
      if (battery === null) {
        await ctx.warn('No battery level found in Nightscout device status');
        await ctx.skipped();
        return ctx;
      }

      await ctx.setCurrentValue(battery.toFixed(0));

      const config = await this.jobConfigService.findNextHigher(
        BATTERY_LEVEL_JOB_KEY,
        battery,
      );
      if (config) await ctx.setJobConfiguration(config);

      if (!config) {
        await ctx.info(
          `Battery level ${battery}% is above all configured thresholds — no action needed`,
        );
        await ctx.complete();
        return ctx;
      }

      await ctx.warn(
        `Battery level ${battery}% is at or below threshold ${config.threshold}% — notification required`,
      );

      await ctx.needsNotification({
        title: 'Low battery warning!',
        message: `Device battery is at ${battery}%`,
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

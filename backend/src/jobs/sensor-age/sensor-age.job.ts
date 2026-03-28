import { Injectable } from '@nestjs/common';
import { JobConfigurationService } from '../../job-configuration/job-configuration.service';
import { JobExecutionContext } from '../../job-execution/job-execution.context';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import { NightscoutService } from '../../nightscout/nightscout.service';
import { JobType } from '../../job-type/job-type.decorator';
import { JobTypeBase } from '../../job-type/job-type-base';

export const SENSOR_AGE_JOB_KEY = 'sensor-age';

@Injectable()
@JobType(SENSOR_AGE_JOB_KEY)
export class SensorAgeJob extends JobTypeBase {
  constructor(
    private readonly nightscout: NightscoutService,
    private readonly jobConfigService: JobConfigurationService,
    private readonly jobExecutionService: JobExecutionService,
  ) {
    super();
  }

  async execute(): Promise<JobExecutionContext> {
    const ctx = await this.jobExecutionService.create(SENSOR_AGE_JOB_KEY);
    try {
      const result = await this.nightscout.getLastSensorChange();
      if (!result) {
        await ctx.warn('No sensor change found in Nightscout');
        await ctx.skipped();
        return ctx;
      }

      const { elapsedDays: sensorAge } = result;

      await ctx.setCurrentValue(sensorAge.toFixed(2));

      const config = await this.jobConfigService.findNextLower(
        SENSOR_AGE_JOB_KEY,
        sensorAge,
      );
      if (config) await ctx.setJobConfiguration(config);

      if (!config) {
        await ctx.info(
          `No configuration matches sensor age ${sensorAge.toFixed(2)}d`,
        );
        await ctx.complete();
        return ctx;
      }

      const age = `${sensorAge.toFixed(2)}d`;
      const thr = `${config.threshold}d`;
      await ctx.info(`Sensor age: ${age} (threshold: ${thr})`);

      if (sensorAge >= config.threshold) {
        await ctx.warn(
          `Sensor age ${age} exceeds threshold ${thr} — notification required`,
        );
      } else {
        await ctx.info(
          `Sensor age ${age} is below threshold ${thr} — no action needed`,
        );
      }

      await ctx.needsNotification({
        title: 'Sensor age alarm!',
        message: `Sensor is currently ${age} old`,
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

import { Injectable } from '@nestjs/common';
import { JobConfigurationService } from '../../job-configuration/job-configuration.service';
import { JobExecutionContext } from '../../job-execution/job-execution.context';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import { NightscoutService } from '../../nightscout/nightscout.service';
import { GlucoseChartService } from '../../glucose-report/glucose-chart.service';
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
    private readonly glucoseChart: GlucoseChartService,
  ) {
    super();
  }

  async execute(): Promise<JobExecutionContext> {
    const ctx = await this.jobExecutionService.create(BATTERY_LEVEL_JOB_KEY);
    try {
      const info = await this.nightscout.getLatestBatteryInfo();
      if (!info) {
        await ctx.warn('No battery level found in Nightscout device status');
        await ctx.skipped();
        return ctx;
      }

      const { level, isCharging, history } = info;
      await ctx.setCurrentValue(level.toFixed(0));

      const config = await this.jobConfigService.findNextHigher(
        BATTERY_LEVEL_JOB_KEY,
        level,
      );
      if (config) await ctx.setJobConfiguration(config);

      if (!config) {
        await ctx.info(
          `Battery level ${level}% is above all configured thresholds — no action needed`,
        );
        await ctx.complete();
        return ctx;
      }

      await ctx.warn(
        `Battery level ${level}% is at or below threshold ${config.threshold}% — notification required`,
      );

      const notificationPayload: Parameters<typeof ctx.needsNotification>[0] = {
        title: 'Low Battery',
        message: this.buildMessage(level, isCharging, history),
        priority: config.priority,
      };

      if (history.length >= 2) {
        try {
          const chartBuffer = await this.glucoseChart.renderBatteryDrainChart(history);
          notificationPayload.imageBuffers = [
            { data: chartBuffer.toString('base64'), caption: 'Battery Level – Last 12 Hours' },
          ];
        } catch {
          // chart is best-effort; skip on failure
        }
      }

      await ctx.needsNotification(notificationPayload);
      await ctx.complete();
    } catch (err: unknown) {
      await ctx.error(err?.toString() || 'Unknown error');
      await ctx.fail();
    }

    return ctx;
  }

  private buildMessage(
    level: number,
    isCharging: boolean | null,
    history: Array<{ createdAt: Date; level: number }>,
  ): string {
    const bar = (pct: number, len = 10): string => {
      const filled = Math.round((pct / 100) * len);
      return '█'.repeat(filled) + '░'.repeat(len - filled);
    };

    const batteryEmoji = level <= 20 ? '🪫' : '🔋';
    const lines: string[] = [
      `${batteryEmoji} Battery: ${level}%  ${bar(level)}`,
    ];

    if (isCharging !== null) {
      lines.push(isCharging ? '⚡ Charging' : '🔌 Not charging');
    }

    // Calculate 12h drain from oldest to newest entry in history
    if (history.length >= 2) {
      const newest = history[0];
      const oldest = history[history.length - 1];
      const drain = oldest.level - newest.level;
      const hours =
        (newest.createdAt.getTime() - oldest.createdAt.getTime()) / 3_600_000;

      if (drain > 0 && hours > 0) {
        const rate = drain / hours;
        lines.push(`📉 12h drain: ${drain}%  (≈${rate.toFixed(1)}%/h)`);
      } else if (drain <= 0) {
        lines.push(`📈 Battery is recovering`);
      }
    }

    return lines.join('\n');
  }
}

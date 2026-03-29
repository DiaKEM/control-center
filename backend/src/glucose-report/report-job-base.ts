import { JobTypeBase } from '../job-type/job-type-base';
import { JobExecutionContext } from '../job-execution/job-execution.context';
import { JobExecutionService } from '../job-execution/job-execution.service';
import {
  GlucoseReportService,
  GlucoseReportStats,
} from './glucose-report.service';
import { JobConfigurationService } from '../job-configuration/job-configuration.service';

export abstract class ReportJobBase extends JobTypeBase {
  constructor(
    protected readonly jobKey: string,
    protected readonly jobExecutionService: JobExecutionService,
    protected readonly glucoseReport: GlucoseReportService,
    protected readonly jobConfigService: JobConfigurationService,
  ) {
    super();
  }

  protected abstract get reportTitle(): string;
  protected abstract get reportPeriodLabel(): string;
  protected abstract getTimeWindow():
    | { from: Date; to: Date }
    | { error: string };

  // Override in subclasses to attach an image to the notification.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getImageBuffer(
    _stats: GlucoseReportStats,
  ): Promise<Buffer | undefined> {
    return undefined;
  }

  // Override in subclasses to send additional image-only messages after the main report.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getAdditionalImages(
    _stats: GlucoseReportStats,
  ): Promise<Array<{ buffer: Buffer; caption: string }>> {
    return [];
  }

  async execute(): Promise<JobExecutionContext> {
    const ctx = await this.jobExecutionService.create(this.jobKey);
    try {
      const window = this.getTimeWindow();
      if ('error' in window) {
        await ctx.error(window.error);
        await ctx.fail();
        return ctx;
      }

      await ctx.info(
        `Computing ${this.reportTitle} for ${window.from.toISOString()} – ${window.to.toISOString()}`,
      );

      const stats = await this.glucoseReport.compute(window.from, window.to);
      if (!stats) {
        await ctx.warn('No glucose data available for the selected period');
        await ctx.skipped();
        return ctx;
      }

      await ctx.setCurrentValue(`${stats.average} ${stats.unit}`);

      const config = await this.jobConfigService.findFirst(this.jobKey);
      if (!config) {
        await ctx.warn(
          'No job configuration found — notification providers not configured',
        );
        await ctx.complete();
        return ctx;
      }

      await ctx.setJobConfiguration(config);

      const message = this.glucoseReport.formatReport(
        this.reportPeriodLabel,
        stats,
      );

      const mainBuffer = await this.getImageBuffer(stats);
      const additionalImages = await this.getAdditionalImages(stats);

      const imageBuffers: Array<{ data: string; caption?: string }> = [];
      if (mainBuffer)
        imageBuffers.push({ data: mainBuffer.toString('base64') });
      for (const { buffer, caption } of additionalImages) {
        imageBuffers.push({ data: buffer.toString('base64'), caption });
      }

      await ctx.needsNotification({
        title: this.reportTitle,
        message,
        priority: config.priority,
        ...(imageBuffers.length ? { imageBuffers } : {}),
      });

      await ctx.info(
        `Report queued for sending via ${config.provider.join(', ')}`,
      );
      await ctx.complete();
    } catch (err: unknown) {
      await ctx.error(err?.toString() || 'Unknown error');
      await ctx.fail();
    }
    return ctx;
  }
}

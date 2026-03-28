import { Injectable } from '@nestjs/common';
import { JobType } from '../../job-type/job-type.decorator';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import { GlucoseReportService, GlucoseReportStats } from '../../glucose-report/glucose-report.service';
import { GlucoseChartService } from '../../glucose-report/glucose-chart.service';
import { ReportJobBase } from '../../glucose-report/report-job-base';
import { JobConfigurationService } from '../../job-configuration/job-configuration.service';
export const BIWEEKLY_REPORT_JOB_KEY = 'biweekly-report';

@Injectable()
@JobType(BIWEEKLY_REPORT_JOB_KEY)
export class BiweeklyReportJob extends ReportJobBase {
  constructor(
    jobExecutionService: JobExecutionService,
    glucoseReport: GlucoseReportService,
    jobConfigService: JobConfigurationService,
    private readonly glucoseChart: GlucoseChartService,
  ) {
    super(BIWEEKLY_REPORT_JOB_KEY, jobExecutionService, glucoseReport, jobConfigService);
  }

  protected get reportTitle(): string { return '14-Day Report'; }
  protected get reportPeriodLabel(): string { return 'Last 14 days'; }

  protected async getImageBuffer(stats: GlucoseReportStats): Promise<Buffer | undefined> {
    return this.glucoseChart.renderDonut(stats, this.reportTitle);
  }

  protected async getAdditionalImages(stats: GlucoseReportStats): Promise<Array<{ buffer: Buffer; caption: string }>> {
    const avgCaption = 'Daily Averages – Last 14 Days';
    const avgBuffer = await this.glucoseChart.renderLineChart(
      stats.dailyAverages,
      stats.unit,
      stats.ranges,
      avgCaption,
    );

    const tirCaption = 'Daily Time in Range – Last 14 Days';
    const inRangeName = stats.ranges.find((r) => r.name === 'In Range')?.name ?? 'In Range';
    const tirBuffer = await this.glucoseChart.renderTirLineChart(
      stats.dailyTir,
      inRangeName,
      tirCaption,
    );

    return [
      { buffer: avgBuffer, caption: avgCaption },
      { buffer: tirBuffer, caption: tirCaption },
    ];
  }

  protected getTimeWindow(): { from: Date; to: Date } | { error: string } {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 14);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
}

import { Injectable } from '@nestjs/common';
import { JobType } from '../../job-type/job-type.decorator';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import {
  GlucoseReportService,
  GlucoseReportStats,
} from '../../glucose-report/glucose-report.service';
import { GlucoseChartService } from '../../glucose-report/glucose-chart.service';
import { ReportJobBase } from '../../glucose-report/report-job-base';
import { JobConfigurationService } from '../../job-configuration/job-configuration.service';
export const MONTHLY_REPORT_JOB_KEY = 'monthly-report';

@Injectable()
@JobType(MONTHLY_REPORT_JOB_KEY)
export class MonthlyReportJob extends ReportJobBase {
  constructor(
    jobExecutionService: JobExecutionService,
    glucoseReport: GlucoseReportService,
    jobConfigService: JobConfigurationService,
    private readonly glucoseChart: GlucoseChartService,
  ) {
    super(
      MONTHLY_REPORT_JOB_KEY,
      jobExecutionService,
      glucoseReport,
      jobConfigService,
    );
  }

  protected get reportTitle(): string {
    return '6-Month Report';
  }
  protected get reportPeriodLabel(): string {
    return 'Last 6 months';
  }

  protected async getImageBuffer(
    stats: GlucoseReportStats,
  ): Promise<Buffer | undefined> {
    return this.glucoseChart.renderDonut(stats, this.reportTitle);
  }

  protected async getAdditionalImages(
    stats: GlucoseReportStats,
  ): Promise<Array<{ buffer: Buffer; caption: string }>> {
    const [monthlyAverages, monthlyTir] = await Promise.all([
      this.glucoseReport.computeMonthlyAverageHistory(6),
      this.glucoseReport.computeMonthlyTirHistory(6),
    ]);

    const results: Array<{ buffer: Buffer; caption: string }> = [];

    if (monthlyAverages.length) {
      const caption = 'Monthly Averages – Last 6 Months';
      const buffer = await this.glucoseChart.renderMonthlyAverageChart(
        monthlyAverages,
        stats.unit,
        stats.ranges,
        caption,
      );
      results.push({ buffer, caption });
    }

    if (monthlyTir.length) {
      const caption = 'Monthly TIR – Last 6 Months';
      const buffer = await this.glucoseChart.renderMonthlyTirChart(
        monthlyTir,
        caption,
      );
      results.push({ buffer, caption });
    }

    return results;
  }

  protected getTimeWindow(): { from: Date; to: Date } | { error: string } {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth() - 5, 1, 0, 0, 0, 0);
    return { from, to };
  }
}

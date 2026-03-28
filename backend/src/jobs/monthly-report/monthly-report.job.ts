import { Injectable } from '@nestjs/common';
import { JobType } from '../../job-type/job-type.decorator';
import { JobExecutionService } from '../../job-execution/job-execution.service';
import { GlucoseReportService, GlucoseReportStats } from '../../glucose-report/glucose-report.service';
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
    super(MONTHLY_REPORT_JOB_KEY, jobExecutionService, glucoseReport, jobConfigService);
  }

  protected get reportTitle(): string { return '6-Month Report'; }
  protected get reportPeriodLabel(): string { return 'Last 6 months'; }

  protected async getImageBuffer(stats: GlucoseReportStats): Promise<Buffer | undefined> {
    return this.glucoseChart.renderDonut(stats, this.reportTitle);
  }

  protected async getAdditionalImages(_stats: GlucoseReportStats): Promise<Array<{ buffer: Buffer; caption: string }>> {
    const monthlyTir = await this.glucoseReport.computeMonthlyTirHistory(6);
    if (!monthlyTir.length) return [];

    const caption = 'Monthly TIR – Last 6 Months';
    const buffer = await this.glucoseChart.renderMonthlyTirChart(monthlyTir, caption);
    return [{ buffer, caption }];
  }

  protected getTimeWindow(): { from: Date; to: Date } | { error: string } {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth() - 5, 1, 0, 0, 0, 0);
    return { from, to };
  }
}

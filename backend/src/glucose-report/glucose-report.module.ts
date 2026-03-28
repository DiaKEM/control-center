import { Module } from '@nestjs/common';
import { NightscoutModule } from '../nightscout/nightscout.module';
import { AdminSettingsModule } from '../admin/admin-settings.module';
import { GlucoseReportService } from './glucose-report.service';
import { GlucoseChartService } from './glucose-chart.service';

@Module({
  imports: [NightscoutModule, AdminSettingsModule],
  providers: [GlucoseReportService, GlucoseChartService],
  exports: [GlucoseReportService, GlucoseChartService],
})
export class GlucoseReportModule {}

import { Injectable } from '@nestjs/common';
import { NightscoutService } from '../nightscout/nightscout.service';
import { AdminSettingsService } from '../admin/admin-settings.service';

export interface DailyAverage {
  date: string; // YYYY-MM-DD in local time
  average: number;
}

export interface DailyTir {
  date: string; // YYYY-MM-DD in local time
  tir: number;  // percentage 0–100
}

export interface GlucoseReportStats {
  average: number;
  unit: string;
  tir: number;
  ranges: Array<{ name: string; lowerLimit: number; upperLimit: number; percentage: number }>;
  totalReadings: number;
  dailyAverages: DailyAverage[];
  dailyTir: DailyTir[];
}

const MMOL_FACTOR = 18.0182;

@Injectable()
export class GlucoseReportService {
  constructor(
    private readonly nightscout: NightscoutService,
    private readonly adminSettings: AdminSettingsService,
  ) {}

  async compute(from: Date, to: Date): Promise<GlucoseReportStats | null> {
    const windowHours = (to.getTime() - from.getTime()) / 3_600_000;
    const count = Math.max(288, Math.ceil(windowHours * 12 * 1.2));

    const entries = await this.nightscout.getEntries({
      find: { date: { $gte: from.getTime(), $lte: to.getTime() } },
      count,
    });

    const validEntries = entries.filter(
      (e): e is typeof e & { sgv: number } => typeof e.sgv === 'number' && e.sgv > 0,
    );

    if (!validEntries.length) return null;

    const s = await this.adminSettings.getSettings('glucose-limits');
    const unit: string = s?.unit ?? 'mg/dL';
    const configuredRanges: Array<{ name: string; lowerLimit: number; upperLimit: number }> =
      s?.ranges ? (JSON.parse(s.ranges) as Array<{ name: string; lowerLimit: number; upperLimit: number }>) : [];

    const factor = unit === 'mmol/L' ? 1 / MMOL_FACTOR : 1;
    const precision = unit === 'mmol/L' ? 1 : 0;
    const values = validEntries.map((e) => +(e.sgv * factor).toFixed(precision + 1));

    const average = +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(precision);

    const ranges = configuredRanges.map((range) => {
      const count = values.filter((v) => v >= range.lowerLimit && v <= range.upperLimit).length;
      return {
        name: range.name,
        lowerLimit: range.lowerLimit,
        upperLimit: range.upperLimit,
        percentage: +(count / values.length * 100).toFixed(1),
      };
    });

    const inRangeSlot = ranges.find((r) => r.name === 'In Range');
    const tir = inRangeSlot?.percentage ?? 0;

    // Group converted values by local date (YYYY-MM-DD) for daily averages
    const byDate = new Map<string, number[]>();
    validEntries.forEach((entry, i) => {
      const d = new Date(entry.date ?? Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const bucket = byDate.get(key) ?? [];
      bucket.push(values[i]);
      byDate.set(key, bucket);
    });
    const inRangeLimits = configuredRanges.find((r) => r.name === 'In Range');

    const sortedDates = Array.from(byDate.keys()).sort();

    const dailyAverages: DailyAverage[] = sortedDates.map((date) => {
      const vals = byDate.get(date)!;
      return { date, average: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(precision) };
    });

    const dailyTir: DailyTir[] = sortedDates.map((date) => {
      const vals = byDate.get(date)!;
      const inRange = inRangeLimits
        ? vals.filter((v) => v >= inRangeLimits.lowerLimit && v <= inRangeLimits.upperLimit).length
        : 0;
      return { date, tir: +(inRange / vals.length * 100).toFixed(1) };
    });

    return { average, unit, tir, ranges, totalReadings: values.length, dailyAverages, dailyTir };
  }

  /**
   * Fetches the last `months` calendar months and returns the TIR per month
   * based on the configured "In Range" limits.
   */
  async computeMonthlyTirHistory(months: number): Promise<DailyTir[]> {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth() - months + 1, 1, 0, 0, 0, 0);

    const count = Math.ceil(months * 30 * 24 * 12 * 1.2);
    const entries = await this.nightscout.getEntries({
      find: { date: { $gte: from.getTime(), $lte: to.getTime() } },
      count,
    });

    const s = await this.adminSettings.getSettings('glucose-limits');
    const unit: string = s?.unit ?? 'mg/dL';
    const configuredRanges: Array<{ name: string; lowerLimit: number; upperLimit: number }> =
      s?.ranges ? (JSON.parse(s.ranges) as Array<{ name: string; lowerLimit: number; upperLimit: number }>) : [];
    const inRangeLimits = configuredRanges.find((r) => r.name === 'In Range');
    if (!inRangeLimits) return [];

    const factor = unit === 'mmol/L' ? 1 / MMOL_FACTOR : 1;
    const precision = unit === 'mmol/L' ? 1 : 0;

    const byMonth = new Map<string, number[]>();
    for (const entry of entries) {
      if (typeof entry.sgv !== 'number' || entry.sgv <= 0) continue;
      const d = new Date(entry.date ?? Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const value = +(entry.sgv * factor).toFixed(precision + 1);
      const bucket = byMonth.get(key) ?? [];
      bucket.push(value);
      byMonth.set(key, bucket);
    }

    return Array.from(byMonth.entries())
      .map(([date, vals]) => {
        const inRangeCount = vals.filter(
          (v) => v >= inRangeLimits.lowerLimit && v <= inRangeLimits.upperLimit,
        ).length;
        return { date, tir: +(inRangeCount / vals.length * 100).toFixed(1) };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Fetches the last `days` nights (00:00–06:00 local) and returns the TIR
   * for each night based on the configured "In Range" limits.
   */
  async computeNightlyTirHistory(days: number): Promise<DailyTir[]> {
    const to = new Date();
    to.setHours(6, 0, 0, 0);
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    // Full 24 h × days to cover entire window — nightly filtering happens in memory
    const count = Math.ceil(days * 24 * 12 * 1.2);
    const entries = await this.nightscout.getEntries({
      find: { date: { $gte: from.getTime(), $lte: to.getTime() } },
      count,
    });

    const s = await this.adminSettings.getSettings('glucose-limits');
    const unit: string = s?.unit ?? 'mg/dL';
    const configuredRanges: Array<{ name: string; lowerLimit: number; upperLimit: number }> =
      s?.ranges ? (JSON.parse(s.ranges) as Array<{ name: string; lowerLimit: number; upperLimit: number }>) : [];
    const inRangeLimits = configuredRanges.find((r) => r.name === 'In Range');
    if (!inRangeLimits) return [];

    const factor = unit === 'mmol/L' ? 1 / MMOL_FACTOR : 1;
    const precision = unit === 'mmol/L' ? 1 : 0;

    const byDate = new Map<string, number[]>();
    for (const entry of entries) {
      if (typeof entry.sgv !== 'number' || entry.sgv <= 0) continue;
      const d = new Date(entry.date ?? Date.now());
      if (d.getHours() >= 6) continue; // keep only 00:00–05:59
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const value = +(entry.sgv * factor).toFixed(precision + 1);
      const bucket = byDate.get(key) ?? [];
      bucket.push(value);
      byDate.set(key, bucket);
    }

    return Array.from(byDate.entries())
      .map(([date, vals]) => {
        const inRangeCount = vals.filter(
          (v) => v >= inRangeLimits.lowerLimit && v <= inRangeLimits.upperLimit,
        ).length;
        return { date, tir: +(inRangeCount / vals.length * 100).toFixed(1) };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  formatReport(periodLabel: string, stats: GlucoseReportStats): string {
    const u = stats.unit;
    const lines = [
      `Average blood glucose level: ${stats.average} ${u}`,
      `Total TIR: ${stats.tir}%`,
      `--------------------------------------`,
      ...stats.ranges.map((r) => `${r.name} (${r.lowerLimit}-${r.upperLimit} ${u}): ${r.percentage}%`),
    ];
    return lines.join('\n');
  }
}

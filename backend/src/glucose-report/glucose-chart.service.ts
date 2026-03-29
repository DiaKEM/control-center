import { Injectable } from '@nestjs/common';
import * as vega from 'vega';
import sharp from 'sharp';
import type {
  DailyAverage,
  DailyTir,
  GlucoseReportStats,
} from './glucose-report.service';

const RANGE_COLORS: Record<string, string> = {
  'Very Low': '#7b1d1d',
  Low: '#e67e22',
  'In Range': '#27ae60',
  High: '#f39c12',
  'Very High': '#c0392b',
};

const RANGE_BAND_COLORS: Record<string, string> = {
  'Very Low': '#ffcdd2',
  Low: '#ffe0b2',
  'In Range': '#c8e6c9',
  High: '#fff9c4',
  'Very High': '#f8bbd0',
};

@Injectable()
export class GlucoseChartService {
  async renderDonut(
    stats: GlucoseReportStats,
    title = 'Report',
  ): Promise<Buffer> {
    const tableValues = stats.ranges.map((r) => ({
      label: `${r.name}: ${r.percentage}%`,
      value: r.percentage,
      color: RANGE_COLORS[r.name] ?? '#9e9e9e',
    }));

    const spec: vega.Spec = {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      width: 480,
      height: 300,
      padding: 20,
      background: '#ffffff',
      title: {
        text: [
          title,
          `Avg: ${stats.average} ${stats.unit}  |  TIR: ${stats.tir}%`,
        ] as string[],
        fontSize: 14,
        fontWeight: 'bold' as const,
        color: '#333333',
        anchor: 'middle' as const,
        offset: 6,
      },
      data: [
        {
          name: 'table',
          values: tableValues,
          transform: [{ type: 'pie' as const, field: 'value' }],
        },
      ],
      scales: [
        {
          name: 'color',
          type: 'ordinal' as const,
          domain: { data: 'table', field: 'label' },
          range: tableValues.map((v) => v.color),
        },
      ],
      legends: [
        {
          fill: 'color',
          orient: 'right' as const,
          labelFontSize: 12,
          symbolSize: 200,
          rowPadding: 6,
        },
      ],
      marks: [
        {
          type: 'arc' as const,
          from: { data: 'table' },
          encode: {
            update: {
              fill: { scale: 'color', field: 'label' },
              x: { signal: 'width / 2 - 60' },
              y: { signal: 'height / 2' },
              startAngle: { field: 'startAngle' },
              endAngle: { field: 'endAngle' },
              innerRadius: { value: 75 },
              outerRadius: { value: 135 },
              cornerRadius: { value: 3 },
              stroke: { value: '#ffffff' },
              strokeWidth: { value: 2 },
            },
          },
        },
        {
          type: 'text' as const,
          encode: {
            update: {
              x: { signal: 'width / 2 - 60' },
              y: { signal: 'height / 2 - 8' },
              text: { value: `${stats.tir}%` },
              align: { value: 'center' as const },
              baseline: { value: 'middle' as const },
              fontSize: { value: 24 },
              fontWeight: { value: 'bold' as const },
              fill: { value: '#27ae60' },
            },
          },
        },
        {
          type: 'text' as const,
          encode: {
            update: {
              x: { signal: 'width / 2 - 60' },
              y: { signal: 'height / 2 + 18' },
              text: { value: 'TIR' },
              align: { value: 'center' as const },
              baseline: { value: 'middle' as const },
              fontSize: { value: 11 },
              fill: { value: '#888888' },
            },
          },
        },
      ],
    };

    const view = new vega.View(vega.parse(spec), {
      renderer: 'none',
      logLevel: vega.Warn,
    });
    await view.runAsync();
    const svgString = await view.toSVG();
    view.finalize();

    return sharp(Buffer.from(svgString)).png().toBuffer();
  }

  async renderLineChart(
    dailyAverages: DailyAverage[],
    unit: string,
    ranges: Array<{ name: string; lowerLimit: number; upperLimit: number }>,
    title: string,
  ): Promise<Buffer> {
    // Format dates as "Mar 14" for axis labels
    const chartData = dailyAverages.map((d) => ({
      date: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      average: d.average,
    }));

    const avgs = chartData.map((d) => d.average);
    const limits = ranges.flatMap((r) => [r.lowerLimit, r.upperLimit]);
    const yMin = Math.floor(Math.min(...avgs, ...limits) * 0.93);
    const yMax = Math.ceil(Math.max(...avgs, ...limits) * 1.05);

    const bandData = ranges.map((r) => ({
      name: r.name,
      y0: Math.max(r.lowerLimit, yMin),
      y1: Math.min(r.upperLimit, yMax),
      color: RANGE_BAND_COLORS[r.name] ?? '#f5f5f5',
    }));

    const spec: vega.Spec = {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      width: 520,
      height: 280,
      padding: { top: 10, left: 55, right: 20, bottom: 55 },
      background: '#ffffff',
      title: {
        text: title,
        fontSize: 14,
        fontWeight: 'bold' as const,
        color: '#333333',
        anchor: 'middle' as const,
        offset: 8,
      },
      data: [
        { name: 'bands', values: bandData },
        { name: 'points', values: chartData },
      ],
      scales: [
        {
          name: 'x',
          type: 'point' as const,
          domain: { data: 'points', field: 'date' },
          range: 'width' as const,
          padding: 0.4,
        },
        {
          name: 'y',
          type: 'linear' as const,
          domain: [yMin, yMax],
          range: 'height' as const,
          nice: true,
          zero: false,
        },
      ],
      axes: [
        {
          orient: 'bottom' as const,
          scale: 'x',
          labelAngle: -45,
          labelAlign: 'right' as const,
          labelFontSize: 11,
        },
        {
          orient: 'left' as const,
          scale: 'y',
          labelFontSize: 11,
          title: unit,
          titleFontSize: 12,
          tickCount: 6,
        },
      ],
      marks: [
        // Range background bands
        {
          type: 'rect' as const,
          from: { data: 'bands' },
          encode: {
            update: {
              x: { value: 0 },
              x2: { signal: 'width' },
              y: { scale: 'y', field: 'y1' },
              y2: { scale: 'y', field: 'y0' },
              fill: { field: 'color' },
              opacity: { value: 0.7 },
            },
          },
        },
        // Line
        {
          type: 'line' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'average' },
              stroke: { value: '#1565c0' },
              strokeWidth: { value: 2.5 },
              interpolate: { value: 'monotone' },
            },
          },
        },
        // Circles at each point
        {
          type: 'symbol' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'average' },
              size: { value: 55 },
              fill: { value: '#1565c0' },
              stroke: { value: '#ffffff' },
              strokeWidth: { value: 1.5 },
            },
          },
        },
        // Value labels above each point
        {
          type: 'text' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'average', offset: -10 },
              text: { field: 'average' },
              align: { value: 'center' as const },
              baseline: { value: 'bottom' as const },
              fontSize: { value: 10 },
              fill: { value: '#333333' },
            },
          },
        },
      ],
    };

    const view = new vega.View(vega.parse(spec), {
      renderer: 'none',
      logLevel: vega.Warn,
    });
    await view.runAsync();
    const svgString = await view.toSVG();
    view.finalize();

    return sharp(Buffer.from(svgString)).png().toBuffer();
  }

  async renderTirLineChart(
    dailyTir: DailyTir[],
    inRangeName: string,
    title: string,
  ): Promise<Buffer> {
    const chartData = dailyTir.map((d) => ({
      date: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      tir: d.tir,
    }));

    // Clinical TIR quality bands (standard thresholds)
    const bands = [
      { y0: 0, y1: 50, color: '#ffcdd2', label: 'Poor' },
      { y0: 50, y1: 70, color: '#fff9c4', label: 'Acceptable' },
      { y0: 70, y1: 100, color: '#c8e6c9', label: 'Target' },
    ];

    const spec: vega.Spec = {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      width: 520,
      height: 280,
      padding: { top: 10, left: 55, right: 20, bottom: 55 },
      background: '#ffffff',
      title: {
        text: [title, `"${inRangeName}" range — target ≥ 70%`] as string[],
        fontSize: 14,
        fontWeight: 'bold' as const,
        color: '#333333',
        anchor: 'middle' as const,
        offset: 6,
      },
      data: [
        { name: 'bands', values: bands },
        { name: 'points', values: chartData },
      ],
      scales: [
        {
          name: 'x',
          type: 'point' as const,
          domain: { data: 'points', field: 'date' },
          range: 'width' as const,
          padding: 0.4,
        },
        {
          name: 'y',
          type: 'linear' as const,
          domain: [0, 100],
          range: 'height' as const,
          zero: true,
        },
      ],
      axes: [
        {
          orient: 'bottom' as const,
          scale: 'x',
          labelAngle: -45,
          labelAlign: 'right' as const,
          labelFontSize: 11,
        },
        {
          orient: 'left' as const,
          scale: 'y',
          labelFontSize: 11,
          title: 'TIR (%)',
          titleFontSize: 12,
          tickCount: 5,
          format: 'd',
        },
      ],
      marks: [
        // Quality bands
        {
          type: 'rect' as const,
          from: { data: 'bands' },
          encode: {
            update: {
              x: { value: 0 },
              x2: { signal: 'width' },
              y: { scale: 'y', field: 'y1' },
              y2: { scale: 'y', field: 'y0' },
              fill: { field: 'color' },
              opacity: { value: 0.7 },
            },
          },
        },
        // Target reference line at 70%
        {
          type: 'rule' as const,
          encode: {
            update: {
              x: { value: 0 },
              x2: { signal: 'width' },
              y: { scale: 'y', value: 70 },
              stroke: { value: '#2e7d32' },
              strokeWidth: { value: 1.5 },
              strokeDash: { value: [4, 3] },
              opacity: { value: 0.8 },
            },
          },
        },
        // Line
        {
          type: 'line' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'tir' },
              stroke: { value: '#1565c0' },
              strokeWidth: { value: 2.5 },
              interpolate: { value: 'monotone' },
            },
          },
        },
        // Circles
        {
          type: 'symbol' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'tir' },
              size: { value: 55 },
              fill: { value: '#1565c0' },
              stroke: { value: '#ffffff' },
              strokeWidth: { value: 1.5 },
            },
          },
        },
        // Value labels
        {
          type: 'text' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'tir', offset: -10 },
              text: { signal: "datum.tir + '%'" },
              align: { value: 'center' as const },
              baseline: { value: 'bottom' as const },
              fontSize: { value: 10 },
              fill: { value: '#333333' },
            },
          },
        },
      ],
    };

    const view = new vega.View(vega.parse(spec), {
      renderer: 'none',
      logLevel: vega.Warn,
    });
    await view.runAsync();
    const svgString = await view.toSVG();
    view.finalize();

    return sharp(Buffer.from(svgString)).png().toBuffer();
  }

  async renderMonthlyAverageChart(
    monthlyAverages: DailyAverage[],
    unit: string,
    ranges: Array<{ name: string; lowerLimit: number; upperLimit: number }>,
    title: string,
  ): Promise<Buffer> {
    const chartData = monthlyAverages.map((d) => {
      const [year, month] = d.date.split('-');
      const label = new Date(
        Number(year),
        Number(month) - 1,
        1,
      ).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { date: label, average: d.average };
    });

    const avgs = chartData.map((d) => d.average);
    const limits = ranges.flatMap((r) => [r.lowerLimit, r.upperLimit]);
    const yMin = Math.floor(Math.min(...avgs, ...limits) * 0.93);
    const yMax = Math.ceil(Math.max(...avgs, ...limits) * 1.05);

    const bandData = ranges.map((r) => ({
      name: r.name,
      y0: Math.max(r.lowerLimit, yMin),
      y1: Math.min(r.upperLimit, yMax),
      color: RANGE_BAND_COLORS[r.name] ?? '#f5f5f5',
    }));

    const spec: vega.Spec = {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      width: 520,
      height: 280,
      padding: { top: 10, left: 55, right: 20, bottom: 55 },
      background: '#ffffff',
      title: {
        text: title,
        fontSize: 14,
        fontWeight: 'bold' as const,
        color: '#333333',
        anchor: 'middle' as const,
        offset: 8,
      },
      data: [
        { name: 'bands', values: bandData },
        { name: 'points', values: chartData },
      ],
      scales: [
        {
          name: 'x',
          type: 'point' as const,
          domain: { data: 'points', field: 'date' },
          range: 'width' as const,
          padding: 0.4,
        },
        {
          name: 'y',
          type: 'linear' as const,
          domain: [yMin, yMax],
          range: 'height' as const,
          nice: true,
          zero: false,
        },
      ],
      axes: [
        {
          orient: 'bottom' as const,
          scale: 'x',
          labelAngle: -45,
          labelAlign: 'right' as const,
          labelFontSize: 11,
        },
        {
          orient: 'left' as const,
          scale: 'y',
          labelFontSize: 11,
          title: unit,
          titleFontSize: 12,
          tickCount: 6,
        },
      ],
      marks: [
        {
          type: 'rect' as const,
          from: { data: 'bands' },
          encode: {
            update: {
              x: { value: 0 },
              x2: { signal: 'width' },
              y: { scale: 'y', field: 'y1' },
              y2: { scale: 'y', field: 'y0' },
              fill: { field: 'color' },
              opacity: { value: 0.7 },
            },
          },
        },
        {
          type: 'line' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'average' },
              stroke: { value: '#1565c0' },
              strokeWidth: { value: 2.5 },
              interpolate: { value: 'monotone' },
            },
          },
        },
        {
          type: 'symbol' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'average' },
              size: { value: 60 },
              fill: { value: '#1565c0' },
              stroke: { value: '#ffffff' },
              strokeWidth: { value: 1.5 },
            },
          },
        },
        {
          type: 'text' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'average', offset: -10 },
              text: { field: 'average' },
              align: { value: 'center' as const },
              baseline: { value: 'bottom' as const },
              fontSize: { value: 10 },
              fill: { value: '#333333' },
            },
          },
        },
      ],
    };

    const view = new vega.View(vega.parse(spec), {
      renderer: 'none',
      logLevel: vega.Warn,
    });
    await view.runAsync();
    const svgString = await view.toSVG();
    view.finalize();

    return sharp(Buffer.from(svgString)).png().toBuffer();
  }

  async renderBatteryDrainChart(
    history: Array<{ createdAt: Date; level: number }>,
    isCharging: boolean | null = null,
    title = 'Battery Level – Last 12 Hours',
  ): Promise<Buffer> {
    // history is newest-first; reverse to chronological order for the chart
    const sorted = [...history].reverse();

    const chartData = sorted.map((p) => ({
      time: p.createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      level: p.level,
    }));

    // Pre-compute endpoints in TS (avoids Vega expression issues with object references)
    const endpoints = [chartData[0], chartData[chartData.length - 1]];

    const levels = chartData.map((d) => d.level);
    const yMin = Math.max(0, Math.floor(Math.min(...levels)) - 5);
    const yMax = Math.min(100, Math.ceil(Math.max(...levels)) + 5);

    const bands = [
      { y0: Math.max(0, yMin), y1: Math.min(20, yMax), color: '#ffcdd2' }, // critical
      { y0: Math.max(20, yMin), y1: Math.min(50, yMax), color: '#fff9c4' }, // low
      { y0: Math.max(50, yMin), y1: Math.min(100, yMax), color: '#c8e6c9' }, // good
    ].filter((b) => b.y1 > b.y0);

    // Line turns green while charging
    const lineColor = isCharging === true ? '#2e7d32' : '#1565c0';

    const spec: vega.Spec = {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      width: 520,
      height: 260,
      padding: { top: 10, left: 50, right: 20, bottom: 55 },
      background: '#ffffff',
      title: {
        text: title,
        fontSize: 14,
        fontWeight: 'bold' as const,
        color: '#333333',
        anchor: 'middle' as const,
        offset: 8,
      },
      data: [
        { name: 'bands', values: bands },
        { name: 'points', values: chartData },
        { name: 'endpoints', values: endpoints },
      ],
      scales: [
        {
          name: 'x',
          type: 'point' as const,
          domain: { data: 'points', field: 'time' },
          range: 'width' as const,
          padding: 0.1,
        },
        {
          name: 'y',
          type: 'linear' as const,
          domain: [yMin, yMax],
          range: 'height' as const,
          nice: true,
          zero: false,
        },
      ],
      axes: [
        {
          orient: 'bottom' as const,
          scale: 'x',
          labelAngle: -45,
          labelAlign: 'right' as const,
          labelFontSize: 10,
          labelOverlap: true,
        },
        {
          orient: 'left' as const,
          scale: 'y',
          labelFontSize: 11,
          title: 'Battery (%)',
          titleFontSize: 12,
          tickCount: 6,
          format: 'd',
        },
      ],
      marks: [
        // Color bands
        {
          type: 'rect' as const,
          from: { data: 'bands' },
          encode: {
            update: {
              x: { value: 0 },
              x2: { signal: 'width' },
              y: { scale: 'y', field: 'y1' },
              y2: { scale: 'y', field: 'y0' },
              fill: { field: 'color' },
              opacity: { value: 0.6 },
            },
          },
        },
        // Area fill under line
        {
          type: 'area' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'time' },
              y: { scale: 'y', field: 'level' },
              y2: { scale: 'y', value: yMin },
              fill: { value: lineColor },
              fillOpacity: { value: 0.15 },
              interpolate: { value: 'monotone' },
            },
          },
        },
        // Line
        {
          type: 'line' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'time' },
              y: { scale: 'y', field: 'level' },
              stroke: { value: lineColor },
              strokeWidth: { value: 2.5 },
              interpolate: { value: 'monotone' },
            },
          },
        },
        // Start and end point markers
        {
          type: 'symbol' as const,
          from: { data: 'endpoints' },
          encode: {
            update: {
              x: { scale: 'x', field: 'time' },
              y: { scale: 'y', field: 'level' },
              size: { value: 60 },
              fill: { value: lineColor },
              stroke: { value: '#ffffff' },
              strokeWidth: { value: 1.5 },
            },
          },
        },
        // Labels for start and end
        {
          type: 'text' as const,
          from: { data: 'endpoints' },
          encode: {
            update: {
              x: { scale: 'x', field: 'time' },
              y: { scale: 'y', field: 'level', offset: -10 },
              text: { signal: "datum.level + '%'" },
              align: { value: 'center' as const },
              baseline: { value: 'bottom' as const },
              fontSize: { value: 11 },
              fontWeight: { value: 'bold' as const },
              fill: { value: lineColor },
            },
          },
        },
        // Charging status annotation (top-right, only when known)
        ...(isCharging !== null
          ? ([
              {
                type: 'text' as const,
                encode: {
                  update: {
                    x: { signal: 'width' },
                    y: { value: 4 },
                    text: { value: isCharging ? 'Charging' : 'Not charging' },
                    align: { value: 'right' as const },
                    baseline: { value: 'top' as const },
                    fontSize: { value: 11 },
                    fontWeight: { value: 'bold' as const },
                    fill: { value: isCharging ? '#2e7d32' : '#757575' },
                  },
                },
              },
            ] as vega.Mark[])
          : []),
      ],
    };

    const view = new vega.View(vega.parse(spec), {
      renderer: 'none',
      logLevel: vega.Warn,
    });
    await view.runAsync();
    const svgString = await view.toSVG();
    view.finalize();

    return sharp(Buffer.from(svgString)).png().toBuffer();
  }

  async renderMonthlyTirChart(
    monthlyTir: DailyTir[],
    title: string,
  ): Promise<Buffer> {
    const chartData = monthlyTir.map((d) => {
      const [year, month] = d.date.split('-');
      const label = new Date(
        Number(year),
        Number(month) - 1,
        1,
      ).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { date: label, tir: d.tir };
    });

    const bands = [
      { y0: 0, y1: 50, color: '#ffcdd2', label: 'Poor' },
      { y0: 50, y1: 70, color: '#fff9c4', label: 'Acceptable' },
      { y0: 70, y1: 100, color: '#c8e6c9', label: 'Target' },
    ];

    const spec: vega.Spec = {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      width: 520,
      height: 280,
      padding: { top: 10, left: 55, right: 20, bottom: 55 },
      background: '#ffffff',
      title: {
        text: [title, '"In Range" — target ≥ 70%'] as string[],
        fontSize: 14,
        fontWeight: 'bold' as const,
        color: '#333333',
        anchor: 'middle' as const,
        offset: 6,
      },
      data: [
        { name: 'bands', values: bands },
        { name: 'points', values: chartData },
      ],
      scales: [
        {
          name: 'x',
          type: 'point' as const,
          domain: { data: 'points', field: 'date' },
          range: 'width' as const,
          padding: 0.4,
        },
        {
          name: 'y',
          type: 'linear' as const,
          domain: [0, 100],
          range: 'height' as const,
          zero: true,
        },
      ],
      axes: [
        {
          orient: 'bottom' as const,
          scale: 'x',
          labelAngle: -45,
          labelAlign: 'right' as const,
          labelFontSize: 11,
        },
        {
          orient: 'left' as const,
          scale: 'y',
          labelFontSize: 11,
          title: 'TIR (%)',
          titleFontSize: 12,
          tickCount: 5,
          format: 'd',
        },
      ],
      marks: [
        {
          type: 'rect' as const,
          from: { data: 'bands' },
          encode: {
            update: {
              x: { value: 0 },
              x2: { signal: 'width' },
              y: { scale: 'y', field: 'y1' },
              y2: { scale: 'y', field: 'y0' },
              fill: { field: 'color' },
              opacity: { value: 0.7 },
            },
          },
        },
        {
          type: 'rule' as const,
          encode: {
            update: {
              x: { value: 0 },
              x2: { signal: 'width' },
              y: { scale: 'y', value: 70 },
              stroke: { value: '#2e7d32' },
              strokeWidth: { value: 1.5 },
              strokeDash: { value: [4, 3] },
              opacity: { value: 0.8 },
            },
          },
        },
        {
          type: 'line' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'tir' },
              stroke: { value: '#1565c0' },
              strokeWidth: { value: 2.5 },
              interpolate: { value: 'monotone' },
            },
          },
        },
        {
          type: 'symbol' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'tir' },
              size: { value: 60 },
              fill: { value: '#1565c0' },
              stroke: { value: '#ffffff' },
              strokeWidth: { value: 1.5 },
            },
          },
        },
        {
          type: 'text' as const,
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'date' },
              y: { scale: 'y', field: 'tir', offset: -10 },
              text: { signal: "datum.tir + '%'" },
              align: { value: 'center' as const },
              baseline: { value: 'bottom' as const },
              fontSize: { value: 10 },
              fill: { value: '#333333' },
            },
          },
        },
      ],
    };

    const view = new vega.View(vega.parse(spec), {
      renderer: 'none',
      logLevel: vega.Warn,
    });
    await view.runAsync();
    const svgString = await view.toSVG();
    view.finalize();

    return sharp(Buffer.from(svgString)).png().toBuffer();
  }
}

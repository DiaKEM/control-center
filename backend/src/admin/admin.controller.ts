import { createHash } from 'crypto';
import axios from 'axios';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Roles } from '../auth/roles.decorator';
import { NightscoutService } from '../nightscout/nightscout.service';
import { PushoverService } from '../pushover/pushover.service';
import { TelegramService } from '../telegram/telegram.service';
import { JobExecutionService } from '../job-execution/job-execution.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { AdminSettingsService } from './admin-settings.service';

class NightscoutConfigDto {
  url!: string;
  apiKey!: string;
}

class PushoverConfigDto {
  appToken!: string;
  userKey!: string;
}

class TelegramConfigDto {
  botToken!: string;
  chatId!: string;
}

class SchedulerConfigDto {
  expression!: string;
}

class GlucoseRangeDto {
  name!: string;
  lowerLimit!: number;
  upperLimit!: number;
}

class GlucoseLimitsDto {
  unit!: string;
  ranges!: GlucoseRangeDto[];
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('/api/admin')
export class AdminController {
  constructor(
    private readonly config: ConfigService,
    private readonly adminSettings: AdminSettingsService,
    private readonly nightscout: NightscoutService,
    private readonly pushover: PushoverService,
    private readonly telegram: TelegramService,
    private readonly jobExecutions: JobExecutionService,
    private readonly scheduler: SchedulerService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Return current effective service configuration' })
  @ApiOkResponse()
  async getConfig() {
    const [ns, po, tg] = await Promise.all([
      this.adminSettings.getSettings('nightscout'),
      this.adminSettings.getSettings('pushover'),
      this.adminSettings.getSettings('telegram'),
    ]);

    return {
      nightscout: {
        url: ns?.url ?? this.config.get<string>('NIGHTSCOUT_URL', ''),
        apiKey: ns?.apiKey ?? this.config.get<string>('NIGHTSCOUT_API_KEY', ''),
      },
      pushover: {
        appToken:
          po?.appToken ?? this.config.get<string>('PUSHOVER_APP_TOKEN', ''),
        userKey:
          po?.userKey ?? this.config.get<string>('PUSHOVER_USER_KEY', ''),
      },
      telegram: {
        botToken:
          tg?.botToken ?? this.config.get<string>('TELEGRAM_BOT_TOKEN', ''),
        chatId: tg?.chatId ?? this.config.get<string>('TELEGRAM_CHAT_ID', ''),
      },
    };
  }

  @Patch('config/nightscout')
  @ApiOperation({ summary: 'Save Nightscout configuration' })
  @ApiOkResponse()
  async updateNightscout(@Body() body: NightscoutConfigDto) {
    await this.adminSettings.upsertSettings('nightscout', {
      url: body.url,
      apiKey: body.apiKey,
    });
    await this.nightscout.reinitialize();
  }

  @Patch('config/pushover')
  @ApiOperation({ summary: 'Save Pushover configuration' })
  @ApiOkResponse()
  async updatePushover(@Body() body: PushoverConfigDto) {
    await this.adminSettings.upsertSettings('pushover', {
      appToken: body.appToken,
      userKey: body.userKey,
    });
    await this.pushover.reinitialize();
  }

  @Patch('config/telegram')
  @ApiOperation({ summary: 'Save Telegram configuration' })
  @ApiOkResponse()
  async updateTelegram(@Body() body: TelegramConfigDto) {
    await this.adminSettings.upsertSettings('telegram', {
      botToken: body.botToken,
      chatId: body.chatId,
    });
    await this.telegram.reinitialize();
  }

  @Post('config/test/:service')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test connection using the provided credentials (does not save)',
  })
  @ApiOkResponse()
  async testConnection(
    @Param('service') service: string,
    @Body() body: Record<string, string>,
  ): Promise<{ ok: boolean }> {
    try {
      switch (service) {
        case 'nightscout': {
          const url = (body['url'] ?? '').replace(/\/$/, '');
          const apiKey = body['apiKey'] ?? '';
          if (!url || !apiKey) return { ok: false };
          const hashed = createHash('sha1').update(apiKey).digest('hex');
          const client = axios.create({
            baseURL: url,
            headers: { 'api-secret': hashed },
          });
          const { data } = await client.get<{ status?: string }>(
            '/api/v1/status',
          );
          return { ok: data?.status === 'ok' };
        }
        case 'pushover': {
          const { data } = await axios.post<{ status?: number }>(
            'https://api.pushover.net/1/users/validate.json',
            { token: body['appToken'] ?? '', user: body['userKey'] ?? '' },
          );
          return { ok: data?.status === 1 };
        }
        case 'telegram': {
          const botToken = body['botToken'] ?? '';
          if (!botToken) return { ok: false };
          const { data } = await axios.get<{ ok?: boolean }>(
            `https://api.telegram.org/bot${botToken}/getMe`,
          );
          return { ok: data?.ok === true };
        }
        default:
          return { ok: false };
      }
    } catch {
      return { ok: false };
    }
  }

  @Get('scheduler')
  @ApiOperation({ summary: 'Return current scheduler configuration' })
  @ApiOkResponse()
  getSchedulerConfig() {
    return {
      expression: this.scheduler.getEffectiveExpression(),
      nextRun: this.scheduler.getNextRunDate(),
    };
  }

  @Patch('scheduler')
  @ApiOperation({ summary: 'Update cron expression and apply immediately' })
  @ApiOkResponse()
  async updateScheduler(@Body() body: SchedulerConfigDto) {
    await this.adminSettings.upsertSettings('scheduler', {
      expression: body.expression,
    });
    await this.scheduler.reinitialize(body.expression);
    return {
      expression: this.scheduler.getEffectiveExpression(),
      nextRun: this.scheduler.getNextRunDate(),
    };
  }

  @Get('database')
  @ApiOperation({ summary: 'Return database size stats and collection info' })
  @ApiOkResponse()
  async getDatabaseStats() {
    const db = this.connection.db!;

    const [dbStats, collStats] = await Promise.all([
      db.command({ dbStats: 1 }),
      db
        .collection('job_executions')
        .aggregate([{ $collStats: { storageStats: {} } }])
        .toArray(),
    ]);

    const jobStats = collStats[0]?.storageStats as
      | { count: number; size: number }
      | undefined;

    return {
      totalSizeMb: +(dbStats.totalSize / 1024 / 1024).toFixed(2),
      storageSizeMb: +(dbStats.storageSize / 1024 / 1024).toFixed(2),
      collections: dbStats.collections as number,
      jobExecutions: {
        count: jobStats?.count ?? 0,
        sizeMb: jobStats ? +(jobStats.size / 1024 / 1024).toFixed(2) : 0,
      },
    };
  }

  @Delete('database/job-executions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete job execution entries older than a given date',
  })
  @ApiOkResponse()
  async deleteJobExecutions(
    @Query('before') before: string,
  ): Promise<{ deletedCount: number }> {
    const date = new Date(before);
    const deletedCount = await this.jobExecutions.deleteOlderThan(date);
    return { deletedCount };
  }

  @Get('nightscout-info')
  @ApiOperation({ summary: 'Return live Nightscout instance details' })
  @ApiOkResponse()
  async getNightscoutInfo() {
    const [
      version,
      latestGlucose,
      batteryInfo,
      sensorChange,
      pumpChange,
      reservoirLevel,
    ] = await Promise.allSettled([
      this.nightscout.getStatus(),
      this.nightscout.getEntries({ count: 1 }),
      this.nightscout.getLatestBatteryInfo(1),
      this.nightscout.getLastSensorChange(),
      this.nightscout.getLastPumpChange(),
      this.nightscout.getLatestInsulinLevel(),
    ]);

    const entry =
      latestGlucose.status === 'fulfilled' ? latestGlucose.value?.[0] : null;
    const battery =
      batteryInfo.status === 'fulfilled' ? batteryInfo.value : null;
    const sensor =
      sensorChange.status === 'fulfilled' ? sensorChange.value : null;
    const pump = pumpChange.status === 'fulfilled' ? pumpChange.value : null;
    const reservoir =
      reservoirLevel.status === 'fulfilled' ? reservoirLevel.value : null;
    const ns = version.status === 'fulfilled' ? version.value : null;

    return {
      version: ns?.version ?? null,
      latestGlucose:
        entry?.sgv != null
          ? {
              sgv: entry.sgv,
              direction: entry.direction ?? null,
              date: entry.date ?? null,
            }
          : null,
      battery: battery
        ? { level: battery.level, isCharging: battery.isCharging }
        : null,
      sensor: sensor
        ? {
            elapsedDays: +sensor.elapsedDays.toFixed(1),
            changedAt: sensor.treatment.created_at ?? null,
          }
        : null,
      pump: pump
        ? {
            elapsedDays: +pump.elapsedDays.toFixed(1),
            changedAt: pump.treatment.created_at ?? null,
          }
        : null,
      reservoirLevel: reservoir,
    };
  }

  @Get('glucose-limits')
  @ApiOperation({
    summary: 'Return the configured blood glucose limits and named ranges',
  })
  @ApiOkResponse()
  async getGlucoseLimits(): Promise<{
    unit: string;
    ranges: Array<{ name: string; lowerLimit: number; upperLimit: number }>;
  }> {
    const s = await this.adminSettings.getSettings('glucose-limits');
    const ranges = s?.ranges
      ? (JSON.parse(s.ranges) as Array<{
          name: string;
          lowerLimit: number;
          upperLimit: number;
        }>)
      : [];
    return { unit: s?.unit ?? 'mg/dl', ranges };
  }

  @Patch('glucose-limits')
  @ApiOperation({ summary: 'Save blood glucose limits and named ranges' })
  @ApiOkResponse()
  async updateGlucoseLimits(@Body() body: GlucoseLimitsDto): Promise<void> {
    await this.adminSettings.upsertSettings('glucose-limits', {
      unit: body.unit,
      ranges: JSON.stringify(body.ranges),
    });
  }
}

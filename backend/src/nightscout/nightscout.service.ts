import { createHash } from 'crypto';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AdminSettingsService } from '../admin/admin-settings.service';

export interface NightscoutQueryParams {
  count?: number;
  find?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  skip?: number;
  fields?: string;
  [key: string]: unknown;
}

export interface NightscoutEntry {
  _id?: string;
  type?: string;
  sgv?: number;
  dateString?: string;
  date?: number;
  trend?: number;
  direction?: string;
  device?: string;
  utcOffset?: number;
  sysTime?: string;
  [key: string]: unknown;
}

export interface NightscoutTreatment {
  _id?: string;
  eventType?: string;
  created_at?: string;
  glucose?: number;
  glucoseType?: string;
  carbs?: number;
  protein?: number;
  fat?: number;
  insulin?: number;
  units?: string;
  notes?: string;
  enteredBy?: string;
  [key: string]: unknown;
}

export interface NightscoutDeviceStatus {
  _id?: string;
  device?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface NightscoutProfile {
  _id?: string;
  defaultProfile?: string;
  store?: Record<string, unknown>;
  startDate?: string;
  [key: string]: unknown;
}

export interface NightscoutFood {
  _id?: string;
  name?: string;
  carbs?: number;
  fat?: number;
  protein?: number;
  calories?: number;
  unit?: string;
  category?: string;
  [key: string]: unknown;
}

export interface NightscoutActivity {
  _id?: string;
  created_at?: string;
  eventType?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface NightscoutStatus {
  status?: string;
  name?: string;
  version?: string;
  serverTime?: string;
  serverTimeEpoch?: number;
  apiEnabled?: boolean;
  careportalEnabled?: boolean;
  boluscalcEnabled?: boolean;
  settings?: Record<string, unknown>;
  extendedSettings?: Record<string, unknown>;
  [key: string]: unknown;
}

@Injectable()
export class NightscoutService implements OnModuleInit {
  private readonly logger = new Logger(NightscoutService.name);
  private client!: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly adminSettings: AdminSettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reinitialize();
  }

  async reinitialize(): Promise<void> {
    const settings = await this.adminSettings.getSettings('nightscout');
    const baseURL = (
      settings?.url || this.configService.get<string>('NIGHTSCOUT_URL', '')
    ).replace(/\/$/, '');
    const apiKey =
      settings?.apiKey || this.configService.get<string>('NIGHTSCOUT_API_KEY', '');

    if (!baseURL || !apiKey) {
      this.logger.warn('Nightscout not configured — skipping client init');
      return;
    }

    const hashedApiKey = createHash('sha1').update(apiKey).digest('hex');
    this.client = axios.create({
      baseURL,
      headers: { 'api-secret': hashedApiKey, 'Content-Type': 'application/json' },
    });
    this.logger.log('Nightscout client initialized');
  }

  private buildParams(
    query: NightscoutQueryParams = {},
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (query.count !== undefined) params['count'] = query.count;
    if (query.skip !== undefined) params['skip'] = query.skip;
    if (query.fields !== undefined) params['fields'] = query.fields;

    if (query.find) {
      this.flattenObject(query.find, 'find', params);
    }

    if (query.sort) {
      for (const [key, value] of Object.entries(query.sort)) {
        params[`sort[${key}]`] = value;
      }
    }

    // Pass through any extra params
    for (const [key, value] of Object.entries(query)) {
      if (!['count', 'skip', 'fields', 'find', 'sort'].includes(key)) {
        params[key] = value;
      }
    }

    return params;
  }

  /**
   * Recursively flattens a nested object into bracket-notation query params.
   * e.g. { created_at: { $gte: '2020-01-01' } } under prefix 'find' becomes:
   *   find[created_at][$gte] = '2020-01-01'
   */
  private flattenObject(
    obj: Record<string, unknown>,
    prefix: string,
    result: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const flatKey = `${prefix}[${key}]`;
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        this.flattenObject(value as Record<string, unknown>, flatKey, result);
      } else {
        result[flatKey] = value;
      }
    }
  }

  // ─── v1 API ──────────────────────────────────────────────────────────────────

  /** Returns true if the Nightscout API is reachable and reports status 'ok'. */
  async isConnected(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.status === 'ok';
    } catch {
      return false;
    }
  }

  /** GET /api/v1/status */
  async getStatus(): Promise<NightscoutStatus> {
    const { data } = await this.client.get<NightscoutStatus>('/api/v1/status');
    return data;
  }

  /** GET /api/v1/entries */
  async getEntries(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutEntry[]> {
    const { data } = await this.client.get<NightscoutEntry[]>(
      '/api/v1/entries',
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  /**
   * Fetches all entries in a date range by splitting the window into chunks of
   * `chunkDays` days and issuing one request per chunk. This avoids Nightscout
   * 502s caused by requesting too many entries at once, and does not rely on the
   * `skip` parameter which many Nightscout instances do not support.
   *
   * Requires `query.find.date.$gte` and `query.find.date.$lte` (epoch ms).
   */
  async getEntriesPaged(
    query: NightscoutQueryParams = {},
    chunkDays = 7,
  ): Promise<NightscoutEntry[]> {
    const find = (query.find ?? {}) as Record<string, Record<string, number>>;
    const lowerDate: number = find['date']?.['$gte'] ?? 0;
    const upperDate: number = find['date']?.['$lte'] ?? Date.now();

    const chunkMs = chunkDays * 24 * 60 * 60 * 1000;
    // 12 readings/hour × chunkDays + 20% buffer — enough for any CGM
    const countPerChunk = Math.ceil(chunkDays * 24 * 12 * 1.2);

    const results: NightscoutEntry[] = [];
    let chunkEnd = upperDate;

    while (chunkEnd > lowerDate) {
      const chunkStart = Math.max(lowerDate, chunkEnd - chunkMs);
      const page = await this.getEntries({
        ...query,
        find: { ...query.find, date: { $gte: chunkStart, $lte: chunkEnd } },
        count: countPerChunk,
      });
      results.push(...page);
      if (chunkStart <= lowerDate) break;
      chunkEnd = chunkStart - 1;
    }

    return results;
  }

  /** GET /api/v1/entries/:spec */
  async getEntriesBySpec(
    spec: string,
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutEntry[]> {
    const { data } = await this.client.get<NightscoutEntry[]>(
      `/api/v1/entries/${spec}`,
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  /** GET /api/v1/entries/current */
  async getCurrentEntry(): Promise<NightscoutEntry[]> {
    const { data } = await this.client.get<NightscoutEntry[]>(
      '/api/v1/entries/current',
    );
    return data;
  }

  /** POST /api/v1/entries */
  async createEntries(entries: NightscoutEntry[]): Promise<NightscoutEntry[]> {
    const { data } = await this.client.post<NightscoutEntry[]>(
      '/api/v1/entries',
      entries,
    );
    return data;
  }

  /** DELETE /api/v1/entries/:spec */
  async deleteEntries(
    spec: string,
    query: NightscoutQueryParams = {},
  ): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v1/entries/${spec}`, {
      params: this.buildParams(query),
    });
    return data;
  }

  /** GET /api/v1/treatments */
  async getTreatments(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutTreatment[]> {
    const { data } = await this.client.get<NightscoutTreatment[]>(
      '/api/v1/treatments',
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  /** POST /api/v1/treatments */
  async createTreatments(
    treatments: NightscoutTreatment[],
  ): Promise<NightscoutTreatment[]> {
    const { data } = await this.client.post<NightscoutTreatment[]>(
      '/api/v1/treatments',
      treatments,
    );
    return data;
  }

  /** PUT /api/v1/treatments */
  async updateTreatment(
    treatment: NightscoutTreatment,
  ): Promise<NightscoutTreatment> {
    const { data } = await this.client.put<NightscoutTreatment>(
      '/api/v1/treatments',
      treatment,
    );
    return data;
  }

  /** DELETE /api/v1/treatments/:id */
  async deleteTreatment(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v1/treatments/${id}`);
    return data;
  }

  /** GET /api/v1/profile */
  async getProfiles(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutProfile[]> {
    const { data } = await this.client.get<NightscoutProfile[]>(
      '/api/v1/profile',
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  /** POST /api/v1/profile */
  async createProfile(profile: NightscoutProfile): Promise<NightscoutProfile> {
    const { data } = await this.client.post<NightscoutProfile>(
      '/api/v1/profile',
      profile,
    );
    return data;
  }

  /** GET /api/v1/devicestatus */
  async getDeviceStatuses(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutDeviceStatus[]> {
    const { data } = await this.client.get<NightscoutDeviceStatus[]>(
      '/api/v1/devicestatus',
      { params: this.buildParams(query) },
    );
    return data;
  }

  /** POST /api/v1/devicestatus */
  async createDeviceStatus(
    deviceStatus: NightscoutDeviceStatus,
  ): Promise<NightscoutDeviceStatus> {
    const { data } = await this.client.post<NightscoutDeviceStatus>(
      '/api/v1/devicestatus',
      deviceStatus,
    );
    return data;
  }

  /** DELETE /api/v1/devicestatus/:id */
  async deleteDeviceStatus(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v1/devicestatus/${id}`);
    return data;
  }

  /** GET /api/v1/food */
  async getFood(query: NightscoutQueryParams = {}): Promise<NightscoutFood[]> {
    const { data } = await this.client.get<NightscoutFood[]>('/api/v1/food', {
      params: this.buildParams(query),
    });
    return data;
  }

  /** POST /api/v1/food */
  async createFood(food: NightscoutFood[]): Promise<NightscoutFood[]> {
    const { data } = await this.client.post<NightscoutFood[]>(
      '/api/v1/food',
      food,
    );
    return data;
  }

  /** PUT /api/v1/food/:id */
  async updateFood(id: string, food: NightscoutFood): Promise<NightscoutFood> {
    const { data } = await this.client.put<NightscoutFood>(
      `/api/v1/food/${id}`,
      food,
    );
    return data;
  }

  /** DELETE /api/v1/food/:id */
  async deleteFood(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v1/food/${id}`);
    return data;
  }

  /** GET /api/v1/activity */
  async getActivity(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutActivity[]> {
    const { data } = await this.client.get<NightscoutActivity[]>(
      '/api/v1/activity',
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  // ─── v3 API ──────────────────────────────────────────────────────────────────

  /** GET /api/v3/version */
  async getV3Version(): Promise<unknown> {
    const { data } = await this.client.get('/api/v3/version');
    return data;
  }

  /** GET /api/v3/status */
  async getV3Status(): Promise<unknown> {
    const { data } = await this.client.get('/api/v3/status');
    return data;
  }

  /** GET /api/v3/entries */
  async getV3Entries(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutEntry[]> {
    const { data } = await this.client.get<NightscoutEntry[]>(
      '/api/v3/entries',
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  /** GET /api/v3/entries/:id */
  async getV3EntryById(id: string): Promise<NightscoutEntry> {
    const { data } = await this.client.get<NightscoutEntry>(
      `/api/v3/entries/${id}`,
    );
    return data;
  }

  /** POST /api/v3/entries */
  async createV3Entry(entry: NightscoutEntry): Promise<NightscoutEntry> {
    const { data } = await this.client.post<NightscoutEntry>(
      '/api/v3/entries',
      entry,
    );
    return data;
  }

  /** PUT /api/v3/entries/:id */
  async updateV3Entry(
    id: string,
    entry: NightscoutEntry,
  ): Promise<NightscoutEntry> {
    const { data } = await this.client.put<NightscoutEntry>(
      `/api/v3/entries/${id}`,
      entry,
    );
    return data;
  }

  /** PATCH /api/v3/entries/:id */
  async patchV3Entry(
    id: string,
    entry: Partial<NightscoutEntry>,
  ): Promise<NightscoutEntry> {
    const { data } = await this.client.patch<NightscoutEntry>(
      `/api/v3/entries/${id}`,
      entry,
    );
    return data;
  }

  /** DELETE /api/v3/entries/:id */
  async deleteV3Entry(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v3/entries/${id}`);
    return data;
  }

  /** GET /api/v3/treatments */
  async getV3Treatments(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutTreatment[]> {
    const { data } = await this.client.get<NightscoutTreatment[]>(
      '/api/v3/treatments',
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  /** GET /api/v3/treatments/:id */
  async getV3TreatmentById(id: string): Promise<NightscoutTreatment> {
    const { data } = await this.client.get<NightscoutTreatment>(
      `/api/v3/treatments/${id}`,
    );
    return data;
  }

  /** POST /api/v3/treatments */
  async createV3Treatment(
    treatment: NightscoutTreatment,
  ): Promise<NightscoutTreatment> {
    const { data } = await this.client.post<NightscoutTreatment>(
      '/api/v3/treatments',
      treatment,
    );
    return data;
  }

  /** PUT /api/v3/treatments/:id */
  async updateV3Treatment(
    id: string,
    treatment: NightscoutTreatment,
  ): Promise<NightscoutTreatment> {
    const { data } = await this.client.put<NightscoutTreatment>(
      `/api/v3/treatments/${id}`,
      treatment,
    );
    return data;
  }

  /** PATCH /api/v3/treatments/:id */
  async patchV3Treatment(
    id: string,
    treatment: Partial<NightscoutTreatment>,
  ): Promise<NightscoutTreatment> {
    const { data } = await this.client.patch<NightscoutTreatment>(
      `/api/v3/treatments/${id}`,
      treatment,
    );
    return data;
  }

  /** DELETE /api/v3/treatments/:id */
  async deleteV3Treatment(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v3/treatments/${id}`);
    return data;
  }

  /** GET /api/v3/devicestatus */
  async getV3DeviceStatuses(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutDeviceStatus[]> {
    const { data } = await this.client.get<NightscoutDeviceStatus[]>(
      '/api/v3/devicestatus',
      { params: this.buildParams(query) },
    );
    return data;
  }

  /** GET /api/v3/devicestatus/:id */
  async getV3DeviceStatusById(id: string): Promise<NightscoutDeviceStatus> {
    const { data } = await this.client.get<NightscoutDeviceStatus>(
      `/api/v3/devicestatus/${id}`,
    );
    return data;
  }

  /** POST /api/v3/devicestatus */
  async createV3DeviceStatus(
    deviceStatus: NightscoutDeviceStatus,
  ): Promise<NightscoutDeviceStatus> {
    const { data } = await this.client.post<NightscoutDeviceStatus>(
      '/api/v3/devicestatus',
      deviceStatus,
    );
    return data;
  }

  /** DELETE /api/v3/devicestatus/:id */
  async deleteV3DeviceStatus(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v3/devicestatus/${id}`);
    return data;
  }

  /** GET /api/v3/profile */
  async getV3Profiles(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutProfile[]> {
    const { data } = await this.client.get<NightscoutProfile[]>(
      '/api/v3/profile',
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  /** GET /api/v3/profile/:id */
  async getV3ProfileById(id: string): Promise<NightscoutProfile> {
    const { data } = await this.client.get<NightscoutProfile>(
      `/api/v3/profile/${id}`,
    );
    return data;
  }

  /** POST /api/v3/profile */
  async createV3Profile(
    profile: NightscoutProfile,
  ): Promise<NightscoutProfile> {
    const { data } = await this.client.post<NightscoutProfile>(
      '/api/v3/profile',
      profile,
    );
    return data;
  }

  /** PUT /api/v3/profile/:id */
  async updateV3Profile(
    id: string,
    profile: NightscoutProfile,
  ): Promise<NightscoutProfile> {
    const { data } = await this.client.put<NightscoutProfile>(
      `/api/v3/profile/${id}`,
      profile,
    );
    return data;
  }

  /** DELETE /api/v3/profile/:id */
  async deleteV3Profile(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v3/profile/${id}`);
    return data;
  }

  /** GET /api/v3/food */
  async getV3Food(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutFood[]> {
    const { data } = await this.client.get<NightscoutFood[]>('/api/v3/food', {
      params: this.buildParams(query),
    });
    return data;
  }

  /** GET /api/v3/food/:id */
  async getV3FoodById(id: string): Promise<NightscoutFood> {
    const { data } = await this.client.get<NightscoutFood>(
      `/api/v3/food/${id}`,
    );
    return data;
  }

  /** POST /api/v3/food */
  async createV3Food(food: NightscoutFood): Promise<NightscoutFood> {
    const { data } = await this.client.post<NightscoutFood>(
      '/api/v3/food',
      food,
    );
    return data;
  }

  /** PUT /api/v3/food/:id */
  async updateV3Food(
    id: string,
    food: NightscoutFood,
  ): Promise<NightscoutFood> {
    const { data } = await this.client.put<NightscoutFood>(
      `/api/v3/food/${id}`,
      food,
    );
    return data;
  }

  /** DELETE /api/v3/food/:id */
  async deleteV3Food(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v3/food/${id}`);
    return data;
  }

  /** GET /api/v3/activity */
  async getV3Activity(
    query: NightscoutQueryParams = {},
  ): Promise<NightscoutActivity[]> {
    const { data } = await this.client.get<NightscoutActivity[]>(
      '/api/v3/activity',
      {
        params: this.buildParams(query),
      },
    );
    return data;
  }

  /** GET /api/v3/activity/:id */
  async getV3ActivityById(id: string): Promise<NightscoutActivity> {
    const { data } = await this.client.get<NightscoutActivity>(
      `/api/v3/activity/${id}`,
    );
    return data;
  }

  /** POST /api/v3/activity */
  async createV3Activity(
    activity: NightscoutActivity,
  ): Promise<NightscoutActivity> {
    const { data } = await this.client.post<NightscoutActivity>(
      '/api/v3/activity',
      activity,
    );
    return data;
  }

  /** PUT /api/v3/activity/:id */
  async updateV3Activity(
    id: string,
    activity: NightscoutActivity,
  ): Promise<NightscoutActivity> {
    const { data } = await this.client.put<NightscoutActivity>(
      `/api/v3/activity/${id}`,
      activity,
    );
    return data;
  }

  /** DELETE /api/v3/activity/:id */
  async deleteV3Activity(id: string): Promise<unknown> {
    const { data } = await this.client.delete(`/api/v3/activity/${id}`);
    return data;
  }

  /** GET /api/v3/settings */
  async getV3Settings(): Promise<unknown> {
    const { data } = await this.client.get('/api/v3/settings');
    return data;
  }

  /**
   * Returns the battery percentage (0–100) reported by the most recent
   * devicestatus entry, or null if no entry or battery field is present.
   * Reads `uploader.battery` which is populated by most Nightscout uploaders.
   */
  async getLatestBatteryLevel(): Promise<number | null> {
    const info = await this.getLatestBatteryInfo();
    return info?.level ?? null;
  }

  /**
   * Returns current battery level, charging state (if reported by the uploader),
   * and a history of readings over the last `historyHours` hours.
   * Charging state is read from `uploader.isCharging` / `uploader.charging` —
   * not all uploaders report this; returns null when unavailable.
   */
  async getLatestBatteryInfo(historyHours = 12): Promise<{
    level: number;
    isCharging: boolean | null;
    history: Array<{ createdAt: Date; level: number }>;
  } | null> {
    // Fetch by count only — date filters and sort are not reliably supported on /devicestatus.
    // Nightscout returns devicestatus records newest-first by default.
    const statuses = await this.getDeviceStatuses({
      count: Math.ceil(historyHours * 12) + 1,
    });

    if (!statuses.length) return null;

    const extractLevel = (s: NightscoutDeviceStatus): number | null => {
      const uploader = s['uploader'] as { battery?: number } | undefined;
      if (typeof uploader?.battery === 'number') return uploader.battery;
      const uploaderBattery = s['uploaderBattery'] as number | undefined;
      if (typeof uploaderBattery === 'number') return uploaderBattery;
      return null;
    };

    const latest = statuses[0];
    const level = extractLevel(latest);
    if (level === null) return null;

    const uploader = latest['uploader'] as {
      battery?: number;
      isCharging?: boolean;
      charging?: boolean;
    } | undefined;
    const isCharging: boolean | null =
      uploader?.isCharging
      ?? uploader?.charging
      ?? (typeof latest['isCharging'] === 'boolean' ? (latest['isCharging'] as boolean) : null);

    const history = statuses
      .map((s) => {
        const l = extractLevel(s);
        const createdAt = s['created_at'] ? new Date(s['created_at'] as string) : null;
        return l !== null && createdAt ? { createdAt, level: l } : null;
      })
      .filter((x): x is { createdAt: Date; level: number } => x !== null);

    return { level, isCharging, history };
  }

  /**
   * Returns true if the most recent device status reports a pump occlusion.
   * Checks `pump.status.suspended` which is set to true by closed-loop systems
   * (Loop, AndroidAPS) when the pump suspends due to an occlusion alarm.
   */
  async getLatestPumpOcclusion(): Promise<boolean> {
    const statuses = await this.getDeviceStatuses({ count: 1 });
    const status = statuses[0];
    if (!status) return false;

    const pump = status['pump'] as
      | { status?: { suspended?: boolean } }
      | undefined;

    return pump?.status?.suspended === true;
  }

  /**
   * Returns the insulin reservoir level (units remaining) from the most recent
   * devicestatus entry, or null if not present.
   * Reads `pump.reservoir` which is populated by Loop and AndroidAPS uploaders.
   */
  async getLatestInsulinLevel(): Promise<number | null> {
    const statuses = await this.getDeviceStatuses({ count: 1 });
    const status = statuses[0];
    if (!status) return null;

    const pump = status['pump'] as { reservoir?: number } | undefined;
    if (typeof pump?.reservoir === 'number') return pump.reservoir;

    return null;
  }

  /** Returns the most recent "Sensor Change" treatment and the number of elapsed days since it. */
  async getLastSensorChange(): Promise<{
    treatment: NightscoutTreatment;
    elapsedDays: number;
  } | null> {
    const treatments = await this.getTreatments({
      find: { eventType: 'Sensor Change', created_at: { $gte: '2020-01-01' } },
      count: 1,
    });
    const treatment = treatments[0];
    if (!treatment?.created_at) return null;

    const changedAt = new Date(treatment.created_at);
    if (isNaN(changedAt.getTime())) return null;

    const elapsedDays =
      (Date.now() - changedAt.getTime()) / (1000 * 60 * 60 * 24);
    return { treatment, elapsedDays };
  }

  /** Returns the most recent "Site Change" treatment and the number of elapsed days since it. */
  async getLastPumpChange(): Promise<{
    treatment: NightscoutTreatment;
    elapsedDays: number;
  } | null> {
    const treatments = await this.getTreatments({
      find: { eventType: 'Site Change', created_at: { $gte: '2020-01-01' } },
      count: 1,
    });
    const treatment = treatments[0];
    if (!treatment?.created_at) return null;

    const changedAt = new Date(treatment.created_at);
    if (isNaN(changedAt.getTime())) return null;

    const elapsedDays =
      (Date.now() - changedAt.getTime()) / (1000 * 60 * 60 * 24);
    return { treatment, elapsedDays };
  }
}

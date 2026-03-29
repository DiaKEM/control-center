import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AdminSettingsService } from '../admin/admin-settings.service';

export enum PushoverPriority {
  Lowest = -2,
  Low = -1,
  Normal = 0,
  High = 1,
  Emergency = 2,
}

export enum PushoverSound {
  Pushover = 'pushover',
  Bike = 'bike',
  Bugle = 'bugle',
  CashRegister = 'cashregister',
  Classical = 'classical',
  Cosmic = 'cosmic',
  Falling = 'falling',
  Gamelan = 'gamelan',
  Incoming = 'incoming',
  Intermission = 'intermission',
  Magic = 'magic',
  Mechanical = 'mechanical',
  PianoBar = 'pianobar',
  Siren = 'siren',
  SpaceAlarm = 'spacealarm',
  TugBoat = 'tugboat',
  Alien = 'alien',
  Climb = 'climb',
  Persistent = 'persistent',
  Echo = 'echo',
  UpDown = 'updown',
  Vibrate = 'vibrate',
  None = 'none',
}

export interface PushoverMessage {
  /** The message body. */
  message: string;
  /** The message title. Defaults to the app name if omitted. */
  title?: string;
  /** Override the target device by name. */
  device?: string;
  /** Supplementary URL shown below the message. */
  url?: string;
  /** Title for the supplementary URL. */
  url_title?: string;
  /** Message priority. Use PushoverPriority enum. */
  priority?: PushoverPriority;
  /**
   * How often (in seconds) to retry an emergency message.
   * Required when priority is Emergency. Minimum 30.
   */
  retry?: number;
  /**
   * How long (in seconds) to keep retrying an emergency message.
   * Required when priority is Emergency. Maximum 10800.
   */
  expire?: number;
  /** Callback URL called when an emergency message is acknowledged. */
  callback?: string;
  /** Notification sound. Use PushoverSound enum or a custom sound name. */
  sound?: PushoverSound | string;
  /** Unix timestamp to use as the message time instead of now. */
  timestamp?: number;
  /** Set to 1 to enable HTML formatting in the message body. */
  html?: 0 | 1;
  /** Set to 1 to enable Monospace formatting in the message body. */
  monospace?: 0 | 1;
  /** Time-to-live in seconds. Message is deleted from devices after this. */
  ttl?: number;
  /** Override the target user/group key for this specific message. */
  user?: string;
}

export interface PushoverMessageResponse {
  status: number;
  request: string;
  receipt?: string;
  errors?: string[];
}

export interface PushoverValidateResponse {
  status: number;
  request: string;
  group: number;
  devices: string[];
  licenses: string[];
  errors?: string[];
}

export interface PushoverReceipt {
  status: number;
  acknowledged: number;
  acknowledged_at: number;
  acknowledged_by: string;
  acknowledged_by_device: string;
  last_delivered_at: number;
  expired: number;
  expires_at: number;
  called_back: number;
  called_back_at: number;
  request: string;
}

export interface PushoverSoundsResponse {
  status: number;
  request: string;
  sounds: Record<string, string>;
}

export interface PushoverGroup {
  status: number;
  name: string;
  users: Array<{
    user: string;
    device?: string;
    memo?: string;
    disabled: boolean;
  }>;
  request: string;
}

export interface PushoverGlance {
  /** Short title (up to 100 characters). */
  title?: string;
  /** Short description (up to 100 characters). */
  text?: string;
  /** Subtext, shown below text (up to 100 characters). */
  subtext?: string;
  /** Integer value to display (e.g. unread count). */
  count?: number;
  /** Floating-point value for a progress bar (0.0 – 1.0). */
  percent?: number;
  /** Override the target device by name. */
  device?: string;
}

@Injectable()
export class PushoverService implements OnModuleInit {
  private readonly client: AxiosInstance;
  private appToken!: string;
  private userKey!: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly adminSettings: AdminSettingsService,
  ) {
    this.client = axios.create({
      baseURL: 'https://api.pushover.net/1',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.reinitialize();
  }

  async reinitialize(): Promise<void> {
    const settings = await this.adminSettings.getSettings('pushover');
    this.appToken =
      settings?.appToken ||
      this.configService.get<string>('PUSHOVER_APP_TOKEN', '');
    this.userKey =
      settings?.userKey ||
      this.configService.get<string>('PUSHOVER_USER_KEY', '');
  }

  /**
   * Returns true if the app token and user key are accepted by Pushover.
   */
  async isConnected(): Promise<boolean> {
    try {
      const response = await this.validateUser();
      return response.status === 1;
    } catch {
      return false;
    }
  }

  /**
   * Send a push notification. Returns the request receipt (only present for
   * emergency-priority messages).
   */
  async sendMessage(msg: PushoverMessage): Promise<PushoverMessageResponse> {
    const { data } = await this.client.post<PushoverMessageResponse>(
      '/messages.json',
      {
        token: this.appToken,
        user: msg.user ?? this.userKey,
        message: msg.message,
        title: msg.title,
        device: msg.device,
        url: msg.url,
        url_title: msg.url_title,
        priority: msg.priority,
        retry: msg.retry,
        expire: msg.expire,
        callback: msg.callback,
        sound: msg.sound,
        timestamp: msg.timestamp,
        html: msg.html,
        monospace: msg.monospace,
        ttl: msg.ttl,
      },
    );
    return data;
  }

  /**
   * Send a push notification with an image attachment (multipart upload).
   */
  async sendMessageWithImage(
    msg: PushoverMessage,
    imageBuffer: Buffer,
  ): Promise<PushoverMessageResponse> {
    // oxlint-disable-next-line typescript/no-require-imports
    const FormData = require('form-data') as typeof import('form-data');
    const form = new FormData();
    form.append('token', this.appToken);
    form.append('user', msg.user ?? this.userKey);
    form.append('message', msg.message);
    if (msg.title) form.append('title', msg.title);
    if (msg.priority !== undefined)
      form.append('priority', String(msg.priority));
    if (msg.sound) form.append('sound', msg.sound);
    form.append('attachment', imageBuffer, {
      filename: 'chart.png',
      contentType: 'image/png',
    });

    const { data } = await this.client.post<PushoverMessageResponse>(
      '/messages.json',
      form,
      {
        headers: form.getHeaders(),
      },
    );
    return data;
  }

  /**
   * Validate a user or group key. Optionally checks a specific device.
   */
  async validateUser(
    userKey?: string,
    device?: string,
  ): Promise<PushoverValidateResponse> {
    const { data } = await this.client.post<PushoverValidateResponse>(
      '/users/validate.json',
      {
        token: this.appToken,
        user: userKey ?? this.userKey,
        device,
      },
    );
    return data;
  }

  /**
   * Retrieve the delivery receipt for an emergency-priority message.
   */
  async getReceipt(receipt: string): Promise<PushoverReceipt> {
    const { data } = await this.client.get<PushoverReceipt>(
      `/receipts/${receipt}.json`,
      {
        params: { token: this.appToken },
      },
    );
    return data;
  }

  /**
   * Cancel an emergency-priority message before it expires.
   */
  async cancelEmergency(
    receipt: string,
  ): Promise<{ status: number; request: string }> {
    const { data } = await this.client.post<{
      status: number;
      request: string;
    }>(`/receipts/${receipt}/cancel.json`, { token: this.appToken });
    return data;
  }

  /**
   * Retrieve all available notification sounds.
   */
  async getSounds(): Promise<PushoverSoundsResponse> {
    const { data } = await this.client.get<PushoverSoundsResponse>(
      '/sounds.json',
      {
        params: { token: this.appToken },
      },
    );
    return data;
  }

  /**
   * Retrieve information and members of a delivery group.
   */
  async getGroup(groupKey: string): Promise<PushoverGroup> {
    const { data } = await this.client.get<PushoverGroup>(
      `/groups/${groupKey}.json`,
      {
        params: { token: this.appToken },
      },
    );
    return data;
  }

  /**
   * Add a user to a delivery group.
   */
  async addUserToGroup(
    groupKey: string,
    userKey: string,
    device?: string,
    memo?: string,
  ): Promise<{ status: number; request: string }> {
    const { data } = await this.client.post<{
      status: number;
      request: string;
    }>(`/groups/${groupKey}/add_user.json`, {
      token: this.appToken,
      user: userKey,
      device,
      memo,
    });
    return data;
  }

  /**
   * Remove a user from a delivery group.
   */
  async removeUserFromGroup(
    groupKey: string,
    userKey: string,
  ): Promise<{ status: number; request: string }> {
    const { data } = await this.client.post<{
      status: number;
      request: string;
    }>(`/groups/${groupKey}/delete_user.json`, {
      token: this.appToken,
      user: userKey,
    });
    return data;
  }

  /**
   * Temporarily disable a user within a delivery group.
   */
  async disableGroupUser(
    groupKey: string,
    userKey: string,
  ): Promise<{ status: number; request: string }> {
    const { data } = await this.client.post<{
      status: number;
      request: string;
    }>(`/groups/${groupKey}/disable_user.json`, {
      token: this.appToken,
      user: userKey,
    });
    return data;
  }

  /**
   * Re-enable a previously disabled user within a delivery group.
   */
  async enableGroupUser(
    groupKey: string,
    userKey: string,
  ): Promise<{ status: number; request: string }> {
    const { data } = await this.client.post<{
      status: number;
      request: string;
    }>(`/groups/${groupKey}/enable_user.json`, {
      token: this.appToken,
      user: userKey,
    });
    return data;
  }

  /**
   * Push an update to the Pushover Glances widget.
   */
  async updateGlance(
    glance: PushoverGlance,
  ): Promise<{ status: number; request: string }> {
    const { data } = await this.client.post<{
      status: number;
      request: string;
    }>('/glances.json', {
      token: this.appToken,
      user: this.userKey,
      ...glance,
    });
    return data;
  }
}

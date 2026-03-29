import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AdminSettingsService } from '../admin/admin-settings.service';

export type TelegramParseMode = 'HTML' | 'Markdown' | 'MarkdownV2';

export interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramReplyMarkup {
  inline_keyboard?: TelegramInlineKeyboardButton[][];
  keyboard?: Array<Array<{ text: string }>>;
  remove_keyboard?: boolean;
  force_reply?: boolean;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export interface TelegramSendMessageOptions {
  /** Target chat. Defaults to the configured TELEGRAM_CHAT_ID. */
  chat_id?: string | number;
  /** Thread ID for forum topics. */
  message_thread_id?: number;
  parse_mode?: TelegramParseMode;
  disable_notification?: boolean;
  protect_content?: boolean;
  /** Reply to a specific message. */
  reply_to_message_id?: number;
  reply_markup?: TelegramReplyMarkup;
  /** Disable link preview below the message. */
  link_preview_disabled?: boolean;
}

export interface TelegramSendPhotoOptions extends Omit<
  TelegramSendMessageOptions,
  'link_preview_disabled'
> {
  /** Caption for the photo (up to 1024 chars). */
  caption?: string;
}

export interface TelegramSendDocumentOptions extends Omit<
  TelegramSendMessageOptions,
  'link_preview_disabled'
> {
  caption?: string;
}

export interface TelegramSendLocationOptions {
  chat_id?: string | number;
  message_thread_id?: number;
  /** Radius of uncertainty in metres (0–1500). */
  horizontal_accuracy?: number;
  /** Live location period in seconds (60–86400). */
  live_period?: number;
  /** Direction the user is moving (1–360°). */
  heading?: number;
  /** Max distance from destination to stop live location (1–100000m). */
  proximity_alert_radius?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  reply_markup?: TelegramReplyMarkup;
}

export interface TelegramSendPollOptions {
  chat_id?: string | number;
  message_thread_id?: number;
  is_anonymous?: boolean;
  /** 'regular' or 'quiz'. Defaults to 'regular'. */
  type?: 'regular' | 'quiz';
  allows_multiple_answers?: boolean;
  /** Index of the correct answer for quiz polls (0-based). */
  correct_option_id?: number;
  explanation?: string;
  explanation_parse_mode?: TelegramParseMode;
  /** Open period in seconds (5–600). */
  open_period?: number;
  /** Unix time when the poll closes. */
  close_date?: number;
  is_closed?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  reply_markup?: TelegramReplyMarkup;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  date: number;
  text?: string;
  [key: string]: unknown;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface TelegramChatMember {
  status: string;
  user: TelegramUser;
  [key: string]: unknown;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private client!: AxiosInstance;
  private chatId!: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly adminSettings: AdminSettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reinitialize();
  }

  async reinitialize(): Promise<void> {
    const settings = await this.adminSettings.getSettings('telegram');
    console.log(settings);
    const token = settings?.botToken || this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.chatId = settings?.chatId || this.configService.get<string>('TELEGRAM_CHAT_ID', '');

    if (!token) {
      this.logger.warn('Telegram not configured — skipping client init');
      return;
    }

    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${token}`,
      headers: { 'Content-Type': 'application/json' },
    });
    this.logger.log('Telegram client initialized');
  }

  private async call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const { data } = await this.client.post<TelegramApiResponse<T>>(`/${method}`, params);
    return data.result;
  }

  /**
   * Returns true if the bot token is valid by calling getMe.
   * Also sends a test message to the configured chat to confirm delivery works.
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.getMe();
      await this.sendMessage('✅ Telegram connection check successful.', {
        disable_notification: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get basic info about the bot.
   */
  async getMe(): Promise<TelegramUser> {
    return this.call<TelegramUser>('getMe');
  }

  /**
   * Send a text message to a chat.
   */
  async sendMessage(
    text: string,
    options: TelegramSendMessageOptions = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendMessage', {
      chat_id: options.chat_id ?? this.chatId,
      text,
      message_thread_id: options.message_thread_id,
      parse_mode: options.parse_mode,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_to_message_id: options.reply_to_message_id,
      reply_markup: options.reply_markup,
      link_preview_options: options.link_preview_disabled ? { is_disabled: true } : undefined,
    });
  }

  /**
   * Edit the text of an existing message.
   */
  async editMessageText(
    messageId: number,
    text: string,
    options: Pick<
      TelegramSendMessageOptions,
      'chat_id' | 'parse_mode' | 'reply_markup' | 'link_preview_disabled'
    > = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('editMessageText', {
      chat_id: options.chat_id ?? this.chatId,
      message_id: messageId,
      text,
      parse_mode: options.parse_mode,
      reply_markup: options.reply_markup,
      link_preview_options: options.link_preview_disabled ? { is_disabled: true } : undefined,
    });
  }

  /**
   * Delete a message.
   */
  async deleteMessage(messageId: number, chatId?: string | number): Promise<boolean> {
    return this.call<boolean>('deleteMessage', {
      chat_id: chatId ?? this.chatId,
      message_id: messageId,
    });
  }

  /**
   * Forward a message from one chat to another.
   */
  async forwardMessage(
    messageId: number,
    fromChatId: string | number,
    toChatId?: string | number,
    options: { disable_notification?: boolean; protect_content?: boolean } = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('forwardMessage', {
      chat_id: toChatId ?? this.chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
    });
  }

  /**
   * Copy a message (like forward but without the "Forwarded from" header).
   */
  async copyMessage(
    messageId: number,
    fromChatId: string | number,
    toChatId?: string | number,
    options: {
      caption?: string;
      parse_mode?: TelegramParseMode;
      disable_notification?: boolean;
      protect_content?: boolean;
      reply_markup?: TelegramReplyMarkup;
    } = {},
  ): Promise<{ message_id: number }> {
    return this.call<{ message_id: number }>('copyMessage', {
      chat_id: toChatId ?? this.chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      caption: options.caption,
      parse_mode: options.parse_mode,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_markup: options.reply_markup,
    });
  }

  /**
   * Send a photo by URL or file_id.
   */
  async sendPhoto(photo: string, options: TelegramSendPhotoOptions = {}): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendPhoto', {
      chat_id: options.chat_id ?? this.chatId,
      photo,
      caption: options.caption,
      message_thread_id: options.message_thread_id,
      parse_mode: options.parse_mode,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_to_message_id: options.reply_to_message_id,
      reply_markup: options.reply_markup,
    });
  }

  /**
   * Send a photo from a raw Buffer (multipart upload).
   */
  async sendPhotoBuffer(
    buffer: Buffer,
    options: TelegramSendPhotoOptions & { filename?: string } = {},
  ): Promise<TelegramMessage> {
    // oxlint-disable-next-line typescript/no-require-imports
    const FormData = require('form-data') as typeof import('form-data');
    const form = new FormData();
    form.append('chat_id', String(options.chat_id ?? this.chatId));
    form.append('photo', buffer, {
      filename: options.filename ?? 'chart.png',
      contentType: 'image/png',
    });
    if (options.caption) form.append('caption', options.caption);
    if (options.parse_mode) form.append('parse_mode', options.parse_mode);
    if (options.disable_notification != null)
      form.append('disable_notification', String(options.disable_notification));

    const { data } = await this.client.post<TelegramApiResponse<TelegramMessage>>(
      '/sendPhoto',
      form,
      { headers: form.getHeaders() },
    );
    return data.result;
  }

  /**
   * Send multiple photos as a single album (media group).
   * Each entry can have its own caption. Returns the sent messages.
   */
  async sendMediaGroupBuffers(
    media: Array<{ buffer: Buffer; caption?: string }>,
    options: {
      chat_id?: string | number;
      disable_notification?: boolean;
      reply_to_message_id?: number;
    } = {},
  ): Promise<TelegramMessage[]> {
    // oxlint-disable-next-line typescript/no-require-imports
    const FormData = require('form-data') as typeof import('form-data');
    const form = new FormData();
    form.append('chat_id', String(options.chat_id ?? this.chatId));
    if (options.disable_notification != null)
      form.append('disable_notification', String(options.disable_notification));
    if (options.reply_to_message_id != null)
      form.append('reply_to_message_id', String(options.reply_to_message_id));

    const mediaJson = media.map((item, i) => {
      const key = `photo${i}`;
      form.append(key, item.buffer, {
        filename: `${key}.png`,
        contentType: 'image/png',
      });
      return {
        type: 'photo',
        media: `attach://${key}`,
        ...(item.caption ? { caption: item.caption } : {}),
      };
    });
    form.append('media', JSON.stringify(mediaJson));

    const { data } = await this.client.post<TelegramApiResponse<TelegramMessage[]>>(
      '/sendMediaGroup',
      form,
      { headers: form.getHeaders() },
    );
    return data.result;
  }

  /**
   * Send a document (file) by URL or file_id.
   */
  async sendDocument(
    document: string,
    options: TelegramSendDocumentOptions = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendDocument', {
      chat_id: options.chat_id ?? this.chatId,
      document,
      caption: options.caption,
      message_thread_id: options.message_thread_id,
      parse_mode: options.parse_mode,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_to_message_id: options.reply_to_message_id,
      reply_markup: options.reply_markup,
    });
  }

  /**
   * Send an audio file by URL or file_id.
   */
  async sendAudio(
    audio: string,
    options: TelegramSendDocumentOptions & {
      duration?: number;
      performer?: string;
      title?: string;
    } = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendAudio', {
      chat_id: options.chat_id ?? this.chatId,
      audio,
      caption: options.caption,
      duration: options.duration,
      performer: options.performer,
      title: options.title,
      message_thread_id: options.message_thread_id,
      parse_mode: options.parse_mode,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_to_message_id: options.reply_to_message_id,
      reply_markup: options.reply_markup,
    });
  }

  /**
   * Send a video by URL or file_id.
   */
  async sendVideo(
    video: string,
    options: TelegramSendDocumentOptions & {
      duration?: number;
      width?: number;
      height?: number;
      supports_streaming?: boolean;
    } = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendVideo', {
      chat_id: options.chat_id ?? this.chatId,
      video,
      caption: options.caption,
      duration: options.duration,
      width: options.width,
      height: options.height,
      supports_streaming: options.supports_streaming,
      message_thread_id: options.message_thread_id,
      parse_mode: options.parse_mode,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_to_message_id: options.reply_to_message_id,
      reply_markup: options.reply_markup,
    });
  }

  /**
   * Send an animation (GIF) by URL or file_id.
   */
  async sendAnimation(
    animation: string,
    options: TelegramSendDocumentOptions & {
      duration?: number;
      width?: number;
      height?: number;
    } = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendAnimation', {
      chat_id: options.chat_id ?? this.chatId,
      animation,
      caption: options.caption,
      duration: options.duration,
      width: options.width,
      height: options.height,
      message_thread_id: options.message_thread_id,
      parse_mode: options.parse_mode,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_to_message_id: options.reply_to_message_id,
      reply_markup: options.reply_markup,
    });
  }

  /**
   * Send a location (map pin).
   */
  async sendLocation(
    latitude: number,
    longitude: number,
    options: TelegramSendLocationOptions = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendLocation', {
      chat_id: options.chat_id ?? this.chatId,
      latitude,
      longitude,
      horizontal_accuracy: options.horizontal_accuracy,
      live_period: options.live_period,
      heading: options.heading,
      proximity_alert_radius: options.proximity_alert_radius,
      message_thread_id: options.message_thread_id,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_to_message_id: options.reply_to_message_id,
      reply_markup: options.reply_markup,
    });
  }

  /**
   * Send a poll.
   */
  async sendPoll(
    question: string,
    pollOptions: string[],
    options: TelegramSendPollOptions = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendPoll', {
      chat_id: options.chat_id ?? this.chatId,
      question,
      options: pollOptions,
      message_thread_id: options.message_thread_id,
      is_anonymous: options.is_anonymous,
      type: options.type,
      allows_multiple_answers: options.allows_multiple_answers,
      correct_option_id: options.correct_option_id,
      explanation: options.explanation,
      explanation_parse_mode: options.explanation_parse_mode,
      open_period: options.open_period,
      close_date: options.close_date,
      is_closed: options.is_closed,
      disable_notification: options.disable_notification,
      protect_content: options.protect_content,
      reply_to_message_id: options.reply_to_message_id,
      reply_markup: options.reply_markup,
    });
  }

  /**
   * Stop an open poll.
   */
  async stopPoll(
    messageId: number,
    chatId?: string | number,
  ): Promise<{ id: number; is_closed: boolean }> {
    return this.call<{ id: number; is_closed: boolean }>('stopPoll', {
      chat_id: chatId ?? this.chatId,
      message_id: messageId,
    });
  }

  /**
   * Send a chat action (e.g. "typing", "uploading_photo").
   */
  async sendChatAction(
    action:
      | 'typing'
      | 'upload_photo'
      | 'record_video'
      | 'upload_video'
      | 'record_voice'
      | 'upload_voice'
      | 'upload_document'
      | 'choose_sticker'
      | 'find_location'
      | 'record_video_note'
      | 'upload_video_note',
    chatId?: string | number,
  ): Promise<boolean> {
    return this.call<boolean>('sendChatAction', {
      chat_id: chatId ?? this.chatId,
      action,
    });
  }

  /**
   * Pin a message in a chat.
   */
  async pinMessage(
    messageId: number,
    chatId?: string | number,
    disableNotification = false,
  ): Promise<boolean> {
    return this.call<boolean>('pinChatMessage', {
      chat_id: chatId ?? this.chatId,
      message_id: messageId,
      disable_notification: disableNotification,
    });
  }

  /**
   * Unpin a message in a chat.
   */
  async unpinMessage(messageId: number, chatId?: string | number): Promise<boolean> {
    return this.call<boolean>('unpinChatMessage', {
      chat_id: chatId ?? this.chatId,
      message_id: messageId,
    });
  }

  /**
   * Unpin all messages in a chat.
   */
  async unpinAllMessages(chatId?: string | number): Promise<boolean> {
    return this.call<boolean>('unpinAllChatMessages', {
      chat_id: chatId ?? this.chatId,
    });
  }

  /**
   * Get info about a chat.
   */
  async getChat(chatId?: string | number): Promise<TelegramChat> {
    return this.call<TelegramChat>('getChat', {
      chat_id: chatId ?? this.chatId,
    });
  }

  /**
   * Get the number of members in a chat.
   */
  async getChatMemberCount(chatId?: string | number): Promise<number> {
    return this.call<number>('getChatMemberCount', {
      chat_id: chatId ?? this.chatId,
    });
  }

  /**
   * Get info about a specific member of a chat.
   */
  async getChatMember(userId: number, chatId?: string | number): Promise<TelegramChatMember> {
    return this.call<TelegramChatMember>('getChatMember', {
      chat_id: chatId ?? this.chatId,
      user_id: userId,
    });
  }

  /**
   * Get the most recent updates (messages) received by the bot.
   */
  async getUpdates(
    options: {
      offset?: number;
      limit?: number;
      timeout?: number;
    } = {},
  ): Promise<unknown[]> {
    return this.call<unknown[]>('getUpdates', options);
  }
}

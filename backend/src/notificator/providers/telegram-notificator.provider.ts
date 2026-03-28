import { Injectable } from '@nestjs/common';
import { NotificationPriority } from '../../job-configuration/job-configuration.schema';
import { TelegramService } from '../../telegram/telegram.service';
import { NotificatorProvider } from '../notificator.decorator';
import {
  NotificatorPayload,
  NotificatorProviderBase,
} from '../notificator-provider-base';

const PRIORITY_PREFIX: Record<NotificationPriority, string> = {
  [NotificationPriority.LOW]: '🔵',
  [NotificationPriority.MID]: '🟡',
  [NotificationPriority.HIGH]: '🟠',
  [NotificationPriority.URGENT]: '🔴',
};

@Injectable()
@NotificatorProvider('telegram')
export class TelegramNotificatorProvider extends NotificatorProviderBase {
  constructor(private readonly telegram: TelegramService) {
    super();
  }

  async send(payload: NotificatorPayload): Promise<void> {
    const prefix = PRIORITY_PREFIX[payload.priority];
    const header = payload.title ? `${payload.title}\n` : '';
    const text = `${prefix} ${header}${payload.message}`;

    if (payload.imageBuffer) {
      await this.telegram.sendPhotoBuffer(payload.imageBuffer, { caption: text });
    } else {
      await this.telegram.sendMessage(`${prefix} ${payload.title ? `*${payload.title}*\n` : ''}${payload.message}`);
    }
  }
}

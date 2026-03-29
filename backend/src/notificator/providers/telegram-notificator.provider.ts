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
    const titleLine = payload.title ? `${prefix} *${payload.title}*` : prefix;
    const formattedText = `${titleLine}\n${payload.message}`;

    if (payload.imageBuffers?.length) {
      const media = payload.imageBuffers.map((img) => ({
        buffer: Buffer.from(img.data, 'base64'),
        caption: img.caption ?? '',
      }));
      if (media.length === 1) {
        await this.telegram.sendPhotoBuffer(media[0].buffer, {
          caption: formattedText,
          parse_mode: 'Markdown',
        });
      } else {
        const textMsg = await this.telegram.sendMessage(formattedText, {
          parse_mode: 'Markdown',
        });
        await this.telegram.sendMediaGroupBuffers(media, {
          reply_to_message_id: textMsg.message_id,
        });
      }
    } else if (payload.imageBuffer) {
      await this.telegram.sendPhotoBuffer(payload.imageBuffer, {
        caption: formattedText,
        parse_mode: 'Markdown',
      });
    } else {
      await this.telegram.sendMessage(formattedText, {
        parse_mode: 'Markdown',
      });
    }
  }
}

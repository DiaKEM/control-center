import { Injectable } from '@nestjs/common';
import { NotificationPriority } from '../../job-configuration/job-configuration.schema';
import {
  PushoverPriority,
  PushoverService,
} from '../../pushover/pushover.service';
import { NotificatorProvider } from '../notificator.decorator';
import {
  NotificatorPayload,
  NotificatorProviderBase,
} from '../notificator-provider-base';

const PRIORITY_MAP: Record<NotificationPriority, PushoverPriority> = {
  [NotificationPriority.LOW]: PushoverPriority.Low,
  [NotificationPriority.MID]: PushoverPriority.Normal,
  [NotificationPriority.HIGH]: PushoverPriority.High,
  [NotificationPriority.URGENT]: PushoverPriority.Emergency,
};

@Injectable()
@NotificatorProvider('pushover')
export class PushoverNotificatorProvider extends NotificatorProviderBase {
  constructor(private readonly pushover: PushoverService) {
    super();
  }

  async send(payload: NotificatorPayload): Promise<void> {
    const msg = {
      message: payload.message,
      title: payload.title,
      priority: PRIORITY_MAP[payload.priority],
    };

    if (payload.imageBuffer) {
      await this.pushover.sendMessageWithImage(msg, payload.imageBuffer);
    } else {
      await this.pushover.sendMessage(msg);
    }
  }
}

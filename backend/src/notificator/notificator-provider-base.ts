import { NotificationPriority } from '../job-configuration/job-configuration.schema';

export interface NotificatorPayload {
  title?: string;
  message: string;
  priority: NotificationPriority;
  imageBuffer?: Buffer;
}

export abstract class NotificatorProviderBase {
  abstract send(payload: NotificatorPayload): Promise<void>;
}

import { NotificationPriority } from '../job-configuration/job-configuration.schema';

export interface NotificatorPayload {
  title?: string;
  message: string;
  priority: NotificationPriority;
  imageBuffer?: Buffer;
  /** Image buffers stored as base64 strings so they survive the MongoDB roundtrip. */
  imageBuffers?: Array<{ data: string; caption?: string }>;
}

export abstract class NotificatorProviderBase {
  abstract send(payload: NotificatorPayload): Promise<void>;
}

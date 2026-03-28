import { Injectable, Logger } from '@nestjs/common';
import { NotificatorPayload } from '../notificator/notificator-provider-base';
import { NotificatorProviderRegistryService } from '../notificator/notificator-provider-registry.service';
import { NotificatorProviderKey } from '../notificator/notificator-provider.registry';

@Injectable()
export class NotificationManagerService {
  private readonly logger = new Logger(NotificationManagerService.name);

  constructor(private readonly registry: NotificatorProviderRegistryService) {}

  async sendMessage(
    providers: NotificatorProviderKey[],
    payload: NotificatorPayload,
  ): Promise<void> {
    const keys = this.registry
      .getRegisteredKeys()
      .filter((key) => providers.includes(key));
    await Promise.all(
      keys.map(async (key) => {
        try {
          await this.registry.resolve(key).send(payload);
          this.logger.log(`Notification sent via "${key}"`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Provider "${key}" failed: ${message}`);
          this.logger.error(err);
          throw err;
        }
      }),
    );
  }
}

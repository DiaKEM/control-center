import { Injectable, NotFoundException, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { NotificatorProviderBase } from './notificator-provider-base';
import {
  NotificatorProviderKey,
  NOTIFICATOR_PROVIDER_STORE,
} from './notificator-provider.registry';

@Injectable()
export class NotificatorProviderRegistryService {
  constructor(private readonly moduleRef: ModuleRef) {}

  resolve(key: NotificatorProviderKey): NotificatorProviderBase {
    const cls = NOTIFICATOR_PROVIDER_STORE.get(key);
    if (!cls) {
      throw new NotFoundException(
        `No notificator provider registered for key: "${key}"`,
      );
    }
    return this.moduleRef.get(cls as Type<NotificatorProviderBase>, {
      strict: false,
    });
  }

  getRegisteredKeys(): NotificatorProviderKey[] {
    return Array.from(NOTIFICATOR_PROVIDER_STORE.keys());
  }
}

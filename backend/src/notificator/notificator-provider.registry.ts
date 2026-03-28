import { NotificatorProviderBase } from './notificator-provider-base';

export type NotificatorProviderKey = 'pushover' | 'telegram';

// Populated by @NotificatorProvider() at class-definition time, before the DI container starts.
export const NOTIFICATOR_PROVIDER_STORE = new Map<
  NotificatorProviderKey,
  typeof NotificatorProviderBase
>();

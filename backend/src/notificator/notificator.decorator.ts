import { NotificatorProviderBase } from './notificator-provider-base';
import {
  NotificatorProviderKey,
  NOTIFICATOR_PROVIDER_STORE,
} from './notificator-provider.registry';

export function NotificatorProvider(
  key: NotificatorProviderKey,
): ClassDecorator {
  return (target: Function) => {
    NOTIFICATOR_PROVIDER_STORE.set(
      key,
      target as typeof NotificatorProviderBase,
    );
  };
}

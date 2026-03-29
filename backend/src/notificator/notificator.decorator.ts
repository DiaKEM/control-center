import { NotificatorProviderBase } from './notificator-provider-base';
import {
  NotificatorProviderKey,
  NOTIFICATOR_PROVIDER_STORE,
} from './notificator-provider.registry';

export function NotificatorProvider(
  key: NotificatorProviderKey,
): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    NOTIFICATOR_PROVIDER_STORE.set(
      key,
      target as typeof NotificatorProviderBase,
    );
  };
}

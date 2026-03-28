import { NotificatorProvider } from './notificator.decorator';
import { NOTIFICATOR_PROVIDER_STORE } from './notificator-provider.registry';
import { NotificatorProviderBase } from './notificator-provider-base';

describe('NotificatorProvider decorator', () => {
  it('registers the class in the NOTIFICATOR_PROVIDER_STORE', () => {
    @NotificatorProvider('pushover')
    class TestProvider extends NotificatorProviderBase {
      send = jest.fn();
    }

    expect(NOTIFICATOR_PROVIDER_STORE.get('pushover')).toBe(TestProvider);
  });
});

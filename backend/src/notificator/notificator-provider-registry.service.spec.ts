import { NotFoundException } from '@nestjs/common';
import { NotificatorProviderRegistryService } from './notificator-provider-registry.service';
import { NOTIFICATOR_PROVIDER_STORE } from './notificator-provider.registry';
import { NotificatorProviderBase } from './notificator-provider-base';

class FakeProvider extends NotificatorProviderBase {
  send = jest.fn();
}

describe('NotificatorProviderRegistryService', () => {
  let service: NotificatorProviderRegistryService;
  let moduleRef: { get: jest.Mock };

  beforeEach(() => {
    moduleRef = { get: jest.fn() };
    service = new NotificatorProviderRegistryService(moduleRef as any);
  });

  describe('resolve()', () => {
    it('returns provider instance when key is registered', () => {
      const fakeInstance = new FakeProvider();
      NOTIFICATOR_PROVIDER_STORE.set('pushover', FakeProvider);
      moduleRef.get.mockReturnValue(fakeInstance);
      const result = service.resolve('pushover');
      expect(moduleRef.get).toHaveBeenCalledWith(FakeProvider, { strict: false });
      expect(result).toBe(fakeInstance);
    });

    it('throws NotFoundException when key is not registered', () => {
      NOTIFICATOR_PROVIDER_STORE.delete('telegram');
      expect(() => service.resolve('telegram')).toThrow(NotFoundException);
    });
  });

  describe('getRegisteredKeys()', () => {
    it('returns keys in the store', () => {
      NOTIFICATOR_PROVIDER_STORE.set('pushover', FakeProvider);
      const keys = service.getRegisteredKeys();
      expect(keys).toContain('pushover');
    });
  });
});

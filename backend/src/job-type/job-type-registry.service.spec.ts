import { NotFoundException } from '@nestjs/common';
import { JobTypeRegistryService } from './job-type-registry.service';
import { JOB_TYPE_STORE } from './job-type.registry';
import { JobTypeBase } from './job-type-base';

class FakeJob extends JobTypeBase {
  execute = jest.fn();
}

describe('JobTypeRegistryService', () => {
  let service: JobTypeRegistryService;
  let moduleRef: { get: jest.Mock };

  beforeEach(() => {
    moduleRef = { get: jest.fn() };
    service = new JobTypeRegistryService(moduleRef as any);
  });

  describe('resolve()', () => {
    it('returns the job instance from moduleRef when key is registered', () => {
      const fakeInstance = new FakeJob();
      JOB_TYPE_STORE.set('pump-age', FakeJob);
      moduleRef.get.mockReturnValue(fakeInstance);

      const result = service.resolve('pump-age');

      expect(moduleRef.get).toHaveBeenCalledWith(FakeJob, { strict: false });
      expect(result).toBe(fakeInstance);
    });

    it('throws NotFoundException when key is not registered', () => {
      JOB_TYPE_STORE.delete('pump-occlusion');
      expect(() => service.resolve('pump-occlusion')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRegisteredKeys()', () => {
    it('returns all keys currently in the store', () => {
      JOB_TYPE_STORE.set('battery-level', FakeJob);
      const keys = service.getRegisteredKeys();
      expect(keys).toContain('battery-level');
    });
  });
});

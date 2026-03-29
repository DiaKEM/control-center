import { JobManagerService } from './job-manager.service';

const makeCtxDoc = (overrides: Record<string, unknown> = {}) => ({
  status: 'success',
  logs: [],
  needsNotification: false,
  jobConfiguration: null,
  notification: null,
  ...overrides,
});

describe('JobManagerService', () => {
  let service: JobManagerService;
  let jobTypeRegistry: { getRegisteredKeys: jest.Mock; resolve: jest.Mock };
  let notificationManager: { sendMessage: jest.Mock };
  let notificationChecker: { check: jest.Mock };
  let mockCtx: {
    execute: jest.Mock;
    get: jest.Mock;
    setNotificationSent: jest.Mock;
  };

  beforeEach(() => {
    mockCtx = {
      execute: jest.fn(),
      get: jest.fn(),
      setNotificationSent: jest.fn().mockResolvedValue(undefined),
    };
    jobTypeRegistry = {
      getRegisteredKeys: jest
        .fn()
        .mockReturnValue(['pump-age', 'battery-level']),
      resolve: jest
        .fn()
        .mockReturnValue({ execute: jest.fn().mockResolvedValue(mockCtx) }),
    };
    notificationManager = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };
    notificationChecker = { check: jest.fn().mockResolvedValue([]) };
    service = new JobManagerService(
      jobTypeRegistry as any,
      notificationManager as any,
      notificationChecker as any,
    );
  });

  describe('runAll()', () => {
    it('runs all registered jobs', async () => {
      mockCtx.get.mockResolvedValue(makeCtxDoc());
      await service.runAll();
      expect(jobTypeRegistry.getRegisteredKeys).toHaveBeenCalled();
      expect(jobTypeRegistry.resolve).toHaveBeenCalledTimes(2);
    });
  });

  describe('run()', () => {
    it('completes without notification when needsNotification is false', async () => {
      mockCtx.get.mockResolvedValue(makeCtxDoc({ needsNotification: false }));
      await service.run('pump-age');
      expect(notificationManager.sendMessage).not.toHaveBeenCalled();
    });

    it('skips notification when no jobConfiguration', async () => {
      mockCtx.get.mockResolvedValue(
        makeCtxDoc({
          needsNotification: true,
          jobConfiguration: null,
          notification: { title: 'T', message: 'M' },
        }),
      );
      await service.run('pump-age');
      expect(notificationManager.sendMessage).not.toHaveBeenCalled();
    });

    it('skips notification when no notification payload', async () => {
      mockCtx.get.mockResolvedValue(
        makeCtxDoc({
          needsNotification: true,
          jobConfiguration: { provider: ['pushover'] },
          notification: null,
        }),
      );
      await service.run('pump-age');
      expect(notificationManager.sendMessage).not.toHaveBeenCalled();
    });

    it('skips notification when checker says not due', async () => {
      notificationChecker.check.mockResolvedValue([]);
      mockCtx.get.mockResolvedValue(
        makeCtxDoc({
          needsNotification: true,
          jobConfiguration: { provider: ['pushover'] },
          notification: { title: 'T', message: 'M' },
        }),
      );
      await service.run('pump-age');
      expect(notificationManager.sendMessage).not.toHaveBeenCalled();
    });

    it('sends notification when checker says due', async () => {
      const config = { provider: ['pushover'] };
      const payload = { title: 'T', message: 'M' };
      notificationChecker.check.mockResolvedValue([{ intervalHours: 4 }]);
      mockCtx.get.mockResolvedValue(
        makeCtxDoc({
          needsNotification: true,
          jobConfiguration: config,
          notification: payload,
        }),
      );
      await service.run('pump-age');
      expect(notificationManager.sendMessage).toHaveBeenCalledWith(
        config.provider,
        payload,
      );
      expect(mockCtx.setNotificationSent).toHaveBeenCalled();
    });

    it('catches and logs unhandled errors without throwing', async () => {
      jobTypeRegistry.resolve.mockReturnValue({
        execute: jest.fn().mockRejectedValue(new Error('job crashed')),
      });
      await expect(service.run('pump-age')).resolves.not.toThrow();
    });

    it('handles non-Error throws', async () => {
      jobTypeRegistry.resolve.mockReturnValue({
        execute: jest.fn().mockRejectedValue('plain string error'),
      });
      await expect(service.run('pump-age')).resolves.not.toThrow();
    });
  });
});

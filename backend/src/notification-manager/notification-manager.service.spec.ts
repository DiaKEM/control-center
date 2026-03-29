import { NotificationManagerService } from './notification-manager.service';
import { NotificationPriority } from '../job-configuration/job-configuration.schema';

describe('NotificationManagerService', () => {
  let service: NotificationManagerService;
  let registry: {
    getRegisteredKeys: jest.Mock;
    resolve: jest.Mock;
  };

  const payload = {
    title: 'Alert',
    message: 'Test',
    priority: NotificationPriority.HIGH,
  };

  beforeEach(() => {
    registry = {
      getRegisteredKeys: jest.fn(),
      resolve: jest.fn(),
    };
    service = new NotificationManagerService(registry as any);
  });

  it('sends to matching registered providers', async () => {
    const pushoverSend = jest.fn().mockResolvedValue(undefined);
    registry.getRegisteredKeys.mockReturnValue(['pushover', 'telegram']);
    registry.resolve.mockReturnValue({ send: pushoverSend });

    await service.sendMessage(['pushover'], payload);

    expect(registry.resolve).toHaveBeenCalledWith('pushover');
    expect(pushoverSend).toHaveBeenCalledWith(payload);
  });

  it('does not send to providers not in the providers list', async () => {
    registry.getRegisteredKeys.mockReturnValue(['pushover', 'telegram']);
    const send = jest.fn().mockResolvedValue(undefined);
    registry.resolve.mockReturnValue({ send });

    await service.sendMessage(['pushover'], payload);

    expect(registry.resolve).not.toHaveBeenCalledWith('telegram');
  });

  it('sends to multiple providers when both are requested', async () => {
    const pushoverSend = jest.fn().mockResolvedValue(undefined);
    const telegramSend = jest.fn().mockResolvedValue(undefined);
    registry.getRegisteredKeys.mockReturnValue(['pushover', 'telegram']);
    registry.resolve.mockImplementation((key: string) => ({
      send: key === 'pushover' ? pushoverSend : telegramSend,
    }));

    await service.sendMessage(['pushover', 'telegram'], payload);

    expect(pushoverSend).toHaveBeenCalledWith(payload);
    expect(telegramSend).toHaveBeenCalledWith(payload);
  });

  it('does not throw when a provider fails — logs error instead', async () => {
    registry.getRegisteredKeys.mockReturnValue(['pushover']);
    registry.resolve.mockReturnValue({
      send: jest.fn().mockRejectedValue(new Error('send failed')),
    });

    await expect(
      service.sendMessage(['pushover'], payload),
    ).resolves.not.toThrow();
  });

  it('does not throw when provider throws a non-Error', async () => {
    registry.getRegisteredKeys.mockReturnValue(['pushover']);
    registry.resolve.mockReturnValue({
      send: jest.fn().mockRejectedValue('plain error'),
    });

    await expect(
      service.sendMessage(['pushover'], payload),
    ).resolves.not.toThrow();
  });

  it('does nothing when no registered keys match', async () => {
    registry.getRegisteredKeys.mockReturnValue(['telegram']);
    await service.sendMessage(['pushover'], payload);
    expect(registry.resolve).not.toHaveBeenCalled();
  });

  it('does nothing when providers list is empty', async () => {
    registry.getRegisteredKeys.mockReturnValue(['pushover', 'telegram']);
    await service.sendMessage([], payload);
    expect(registry.resolve).not.toHaveBeenCalled();
  });
});

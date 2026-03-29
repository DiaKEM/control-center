import { TelegramNotificatorProvider } from './telegram-notificator.provider';
import { NotificationPriority } from '../../job-configuration/job-configuration.schema';

describe('TelegramNotificatorProvider', () => {
  let provider: TelegramNotificatorProvider;
  let telegramService: { sendMessage: jest.Mock };

  beforeEach(() => {
    telegramService = { sendMessage: jest.fn().mockResolvedValue({}) };
    provider = new TelegramNotificatorProvider(telegramService as any);
  });

  it.each([
    [NotificationPriority.LOW, '🔵'],
    [NotificationPriority.MID, '🟡'],
    [NotificationPriority.HIGH, '🟠'],
    [NotificationPriority.URGENT, '🔴'],
  ])(
    'prefixes message with correct emoji for priority %s',
    async (priority, emoji) => {
      await provider.send({ message: 'test', priority });
      const call = telegramService.sendMessage.mock.calls[0][0] as string;
      expect(call).toContain(emoji);
    },
  );

  it('includes title in bold markdown when provided', async () => {
    await provider.send({
      title: 'Alert',
      message: 'Low insulin',
      priority: NotificationPriority.HIGH,
    });
    const call = telegramService.sendMessage.mock.calls[0][0] as string;
    expect(call).toContain('*Alert*');
    expect(call).toContain('Low insulin');
  });

  it('omits title header when title is not provided', async () => {
    await provider.send({
      message: 'Simple msg',
      priority: NotificationPriority.LOW,
    });
    const call = telegramService.sendMessage.mock.calls[0][0] as string;
    expect(call).not.toContain('**');
    expect(call).toContain('Simple msg');
  });
});

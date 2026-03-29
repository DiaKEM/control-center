import { PushoverNotificatorProvider } from './pushover-notificator.provider';
import { NotificationPriority } from '../../job-configuration/job-configuration.schema';
import { PushoverPriority } from '../../pushover/pushover.service';

describe('PushoverNotificatorProvider', () => {
  let provider: PushoverNotificatorProvider;
  let pushoverService: { sendMessage: jest.Mock };

  beforeEach(() => {
    pushoverService = { sendMessage: jest.fn().mockResolvedValue({}) };
    provider = new PushoverNotificatorProvider(pushoverService as any);
  });

  it.each([
    [NotificationPriority.LOW, PushoverPriority.Low],
    [NotificationPriority.MID, PushoverPriority.Normal],
    [NotificationPriority.HIGH, PushoverPriority.High],
    [NotificationPriority.URGENT, PushoverPriority.Emergency],
  ])('maps priority %s → %s', async (input, expected) => {
    await provider.send({ message: 'test', priority: input });
    expect(pushoverService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: expected,
      }),
    );
  });

  it('passes message and title to pushover', async () => {
    await provider.send({
      title: 'Alert',
      message: 'Low battery',
      priority: NotificationPriority.HIGH,
    });
    expect(pushoverService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Low battery',
        title: 'Alert',
      }),
    );
  });
});

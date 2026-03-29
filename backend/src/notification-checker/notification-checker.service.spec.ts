import { NotificationCheckerService } from './notification-checker.service';

const TIME_POINT_WINDOW_MS = 3 * 60 * 1000;

const makeExec = (value: unknown) => jest.fn().mockResolvedValue(value);
const makeModelQuery = (value: unknown) => ({
  sort: jest.fn().mockReturnValue({ exec: makeExec(value) }),
});

describe('NotificationCheckerService', () => {
  let service: NotificationCheckerService;
  let model: { findOne: jest.Mock };

  beforeEach(() => {
    model = { findOne: jest.fn().mockReturnValue(makeModelQuery(null)) };
    service = new NotificationCheckerService(model as any);
  });

  describe('check()', () => {
    it('returns empty array when no jobConfiguration', async () => {
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: null,
      } as any;
      const result = await service.check(execution);
      expect(result).toEqual([]);
    });

    it('returns empty array when notifications is empty', async () => {
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: { _id: 'cfg-1', notifications: [] },
      } as any;
      const result = await service.check(execution);
      expect(result).toEqual([]);
    });

    it('returns empty array when notification has neither intervalHours nor timePoint', async () => {
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: { _id: 'cfg-1', notifications: [{}] },
      } as any;
      const result = await service.check(execution);
      expect(result).toEqual([]);
    });
  });

  describe('intervalHours logic', () => {
    it('is due when no previous notification sent', async () => {
      model.findOne.mockReturnValue(makeModelQuery(null));
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: {
          _id: 'cfg-1',
          notifications: [{ intervalHours: 4 }],
        },
      } as any;
      const result = await service.check(execution);
      expect(result).toHaveLength(1);
    });

    it('is due when enough time has elapsed since last notification', async () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      model.findOne.mockReturnValue(
        makeModelQuery({ notificationSentAt: fiveHoursAgo }),
      );
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: {
          _id: 'cfg-1',
          notifications: [{ intervalHours: 4 }],
        },
      } as any;
      const result = await service.check(execution);
      expect(result).toHaveLength(1);
    });

    it('is NOT due when notification was sent recently', async () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      model.findOne.mockReturnValue(
        makeModelQuery({ notificationSentAt: oneHourAgo }),
      );
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: {
          _id: 'cfg-1',
          notifications: [{ intervalHours: 4 }],
        },
      } as any;
      const result = await service.check(execution);
      expect(result).toHaveLength(0);
    });
  });

  describe('timePoint logic', () => {
    it('is due when within window and no previous notification', async () => {
      model.findOne.mockReturnValue(makeModelQuery(null));
      const now = new Date();
      const timePoint = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: { _id: 'cfg-1', notifications: [{ timePoint }] },
      } as any;
      const result = await service.check(execution);
      expect(result).toHaveLength(1);
    });

    it('is NOT due when outside the ±3 min window', async () => {
      model.findOne.mockReturnValue(makeModelQuery(null));
      // Pick a time well outside the current window (6 hours away)
      const farAway = new Date(Date.now() + 6 * 60 * 60 * 1000);
      const timePoint = `${String(farAway.getHours()).padStart(2, '0')}:${String(farAway.getMinutes()).padStart(2, '0')}`;
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: { _id: 'cfg-1', notifications: [{ timePoint }] },
      } as any;
      const result = await service.check(execution);
      expect(result).toHaveLength(0);
    });

    it('is NOT due when within window but already sent in this window', async () => {
      const now = new Date();
      // Last sent 30 seconds ago (within window)
      const recentlySent = new Date(Date.now() - 30 * 1000);
      model.findOne.mockReturnValue(
        makeModelQuery({ notificationSentAt: recentlySent }),
      );
      const timePoint = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: { _id: 'cfg-1', notifications: [{ timePoint }] },
      } as any;
      const result = await service.check(execution);
      expect(result).toHaveLength(0);
    });

    it('is due when within window and last sent was outside this window', async () => {
      const now = new Date();
      // Last sent 6 hours ago (outside the 3-min window around the timePoint)
      const longAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      model.findOne.mockReturnValue(
        makeModelQuery({ notificationSentAt: longAgo }),
      );
      const timePoint = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const execution = {
        jobTypeKey: 'pump-age',
        jobConfiguration: { _id: 'cfg-1', notifications: [{ timePoint }] },
      } as any;
      const result = await service.check(execution);
      expect(result).toHaveLength(1);
    });
  });

  describe('findLastNotificationSentAt()', () => {
    it('queries with jobConfiguration._id when provided', async () => {
      const execution = {
        jobTypeKey: 'battery-level',
        jobConfiguration: {
          _id: 'cfg-99',
          notifications: [{ intervalHours: 2 }],
        },
      } as any;
      await service.check(execution);
      expect(model.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ 'jobConfiguration._id': 'cfg-99' }),
      );
    });
  });
});

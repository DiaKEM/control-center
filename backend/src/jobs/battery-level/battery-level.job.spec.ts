import { BatteryLevelJob, BATTERY_LEVEL_JOB_KEY } from './battery-level.job';
import { NotificationPriority } from '../../job-configuration/job-configuration.schema';

const makeCtx = () => ({
  warn: jest.fn().mockResolvedValue(undefined),
  info: jest.fn().mockResolvedValue(undefined),
  error: jest.fn().mockResolvedValue(undefined),
  skipped: jest.fn().mockResolvedValue(undefined),
  complete: jest.fn().mockResolvedValue(undefined),
  fail: jest.fn().mockResolvedValue(undefined),
  needsNotification: jest.fn().mockResolvedValue(undefined),
  setCurrentValue: jest.fn().mockResolvedValue(undefined),
  setJobConfiguration: jest.fn().mockResolvedValue(undefined),
});

const makeConfig = (threshold: number) => ({
  threshold,
  priority: NotificationPriority.MID,
  provider: ['pushover'],
});

describe('BatteryLevelJob', () => {
  let job: BatteryLevelJob;
  let nightscout: { getLatestBatteryLevel: jest.Mock };
  let jobConfigService: { findNextHigher: jest.Mock };
  let jobExecutionService: { create: jest.Mock };
  let ctx: ReturnType<typeof makeCtx>;

  beforeEach(() => {
    ctx = makeCtx();
    nightscout = { getLatestBatteryLevel: jest.fn() };
    jobConfigService = { findNextHigher: jest.fn() };
    jobExecutionService = { create: jest.fn().mockResolvedValue(ctx) };
    job = new BatteryLevelJob(
      nightscout as any,
      jobConfigService as any,
      jobExecutionService as any,
    );
  });

  it('skips when battery level is null', async () => {
    nightscout.getLatestBatteryLevel.mockResolvedValue(null);
    await job.execute();
    expect(ctx.warn).toHaveBeenCalledWith(
      expect.stringContaining('No battery level'),
    );
    expect(ctx.skipped).toHaveBeenCalled();
    expect(ctx.complete).not.toHaveBeenCalled();
  });

  it('completes without notification when no config matches', async () => {
    nightscout.getLatestBatteryLevel.mockResolvedValue(80);
    jobConfigService.findNextHigher.mockResolvedValue(null);
    await job.execute();
    expect(ctx.setCurrentValue).toHaveBeenCalledWith('80');
    expect(ctx.info).toHaveBeenCalledWith(
      expect.stringContaining('above all configured thresholds'),
    );
    expect(ctx.complete).toHaveBeenCalled();
    expect(ctx.needsNotification).not.toHaveBeenCalled();
  });

  it('notifies when battery is at or below threshold', async () => {
    nightscout.getLatestBatteryLevel.mockResolvedValue(20);
    const config = makeConfig(30);
    jobConfigService.findNextHigher.mockResolvedValue(config);
    await job.execute();
    expect(ctx.setCurrentValue).toHaveBeenCalledWith('20');
    expect(ctx.setJobConfiguration).toHaveBeenCalledWith(config);
    expect(ctx.warn).toHaveBeenCalledWith(
      expect.stringContaining('at or below threshold'),
    );
    expect(ctx.needsNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Low battery warning!',
        message: expect.stringContaining('20%'),
      }),
    );
    expect(ctx.complete).toHaveBeenCalled();
  });

  it('fails on unexpected error', async () => {
    nightscout.getLatestBatteryLevel.mockRejectedValue(
      new Error('network error'),
    );
    await job.execute();
    expect(ctx.error).toHaveBeenCalledWith(
      expect.stringContaining('network error'),
    );
    expect(ctx.fail).toHaveBeenCalled();
  });

  it('uses correct job key', () => {
    expect(BATTERY_LEVEL_JOB_KEY).toBe('battery-level');
    expect(jobExecutionService.create).not.toHaveBeenCalled();
  });

  it('creates execution with correct key', async () => {
    nightscout.getLatestBatteryLevel.mockResolvedValue(null);
    await job.execute();
    expect(jobExecutionService.create).toHaveBeenCalledWith(
      BATTERY_LEVEL_JOB_KEY,
    );
  });
});

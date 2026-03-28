import { InsulinLevelJob, INSULIN_LEVEL_JOB_KEY } from './insulin-level.job';
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
  priority: NotificationPriority.HIGH,
  provider: ['pushover'],
});

describe('InsulinLevelJob', () => {
  let job: InsulinLevelJob;
  let nightscout: { getLatestInsulinLevel: jest.Mock };
  let jobConfigService: { findNextHigher: jest.Mock };
  let jobExecutionService: { create: jest.Mock };
  let ctx: ReturnType<typeof makeCtx>;

  beforeEach(() => {
    ctx = makeCtx();
    nightscout = { getLatestInsulinLevel: jest.fn() };
    jobConfigService = { findNextHigher: jest.fn() };
    jobExecutionService = { create: jest.fn().mockResolvedValue(ctx) };
    job = new InsulinLevelJob(
      nightscout as any,
      jobConfigService as any,
      jobExecutionService as any,
    );
  });

  it('skips when insulin level is null', async () => {
    nightscout.getLatestInsulinLevel.mockResolvedValue(null);
    await job.execute();
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('No insulin level'));
    expect(ctx.skipped).toHaveBeenCalled();
    expect(ctx.complete).not.toHaveBeenCalled();
  });

  it('completes without notification when no config matches', async () => {
    nightscout.getLatestInsulinLevel.mockResolvedValue(150);
    jobConfigService.findNextHigher.mockResolvedValue(null);
    await job.execute();
    expect(ctx.setCurrentValue).toHaveBeenCalledWith('150.0');
    expect(ctx.info).toHaveBeenCalledWith(expect.stringContaining('above all configured thresholds'));
    expect(ctx.complete).toHaveBeenCalled();
    expect(ctx.needsNotification).not.toHaveBeenCalled();
  });

  it('notifies when insulin is at or below threshold', async () => {
    nightscout.getLatestInsulinLevel.mockResolvedValue(30.5);
    const config = makeConfig(50);
    jobConfigService.findNextHigher.mockResolvedValue(config);
    await job.execute();
    expect(ctx.setCurrentValue).toHaveBeenCalledWith('30.5');
    expect(ctx.setJobConfiguration).toHaveBeenCalledWith(config);
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('at or below threshold'));
    expect(ctx.needsNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Low insulin warning!',
      message: expect.stringContaining('30.5U'),
    }));
    expect(ctx.complete).toHaveBeenCalled();
  });

  it('fails on unexpected error', async () => {
    nightscout.getLatestInsulinLevel.mockRejectedValue(new Error('api error'));
    await job.execute();
    expect(ctx.error).toHaveBeenCalledWith(expect.stringContaining('api error'));
    expect(ctx.fail).toHaveBeenCalled();
  });

  it('creates execution with correct key', async () => {
    nightscout.getLatestInsulinLevel.mockResolvedValue(null);
    await job.execute();
    expect(jobExecutionService.create).toHaveBeenCalledWith(INSULIN_LEVEL_JOB_KEY);
  });

  it('handles non-Error throws', async () => {
    nightscout.getLatestInsulinLevel.mockRejectedValue('string error');
    await job.execute();
    expect(ctx.error).toHaveBeenCalledWith('string error');
    expect(ctx.fail).toHaveBeenCalled();
  });
});

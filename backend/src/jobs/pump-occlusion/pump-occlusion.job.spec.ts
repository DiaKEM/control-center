import { PumpOcclusionJob, PUMP_OCCLUSION_JOB_KEY } from './pump-occlusion.job';
import { NotificationPriority } from '../../job-configuration/job-configuration.schema';

const makeCtx = () => ({
  warn: jest.fn().mockResolvedValue(undefined),
  info: jest.fn().mockResolvedValue(undefined),
  error: jest.fn().mockResolvedValue(undefined),
  skipped: jest.fn().mockResolvedValue(undefined),
  complete: jest.fn().mockResolvedValue(undefined),
  fail: jest.fn().mockResolvedValue(undefined),
  needsNotification: jest.fn().mockResolvedValue(undefined),
  setJobConfiguration: jest.fn().mockResolvedValue(undefined),
  setCurrentValue: jest.fn().mockResolvedValue(undefined),
});

const makeConfig = () => ({
  priority: NotificationPriority.URGENT,
  provider: ['pushover'],
});

describe('PumpOcclusionJob', () => {
  let job: PumpOcclusionJob;
  let nightscout: { getLatestPumpOcclusion: jest.Mock };
  let jobConfigService: { findFirst: jest.Mock };
  let jobExecutionService: { create: jest.Mock };
  let ctx: ReturnType<typeof makeCtx>;

  beforeEach(() => {
    ctx = makeCtx();
    nightscout = { getLatestPumpOcclusion: jest.fn() };
    jobConfigService = { findFirst: jest.fn() };
    jobExecutionService = { create: jest.fn().mockResolvedValue(ctx) };
    job = new PumpOcclusionJob(
      nightscout as any,
      jobConfigService as any,
      jobExecutionService as any,
    );
  });

  it('completes without notification when no occlusion detected', async () => {
    nightscout.getLatestPumpOcclusion.mockResolvedValue(false);
    await job.execute();
    expect(ctx.info).toHaveBeenCalledWith(
      expect.stringContaining('No pump occlusion'),
    );
    expect(ctx.complete).toHaveBeenCalled();
    expect(ctx.needsNotification).not.toHaveBeenCalled();
    expect(jobConfigService.findFirst).not.toHaveBeenCalled();
  });

  it('completes without notification when occlusion detected but no config exists', async () => {
    nightscout.getLatestPumpOcclusion.mockResolvedValue(true);
    jobConfigService.findFirst.mockResolvedValue(null);
    await job.execute();
    expect(ctx.warn).toHaveBeenCalledWith(
      expect.stringContaining('Pump occlusion detected'),
    );
    expect(ctx.warn).toHaveBeenCalledWith(
      expect.stringContaining('No job configuration'),
    );
    expect(ctx.needsNotification).not.toHaveBeenCalled();
    expect(ctx.complete).toHaveBeenCalled();
  });

  it('notifies when occlusion is detected and config exists', async () => {
    nightscout.getLatestPumpOcclusion.mockResolvedValue(true);
    const config = makeConfig();
    jobConfigService.findFirst.mockResolvedValue(config);
    await job.execute();
    expect(ctx.setJobConfiguration).toHaveBeenCalledWith(config);
    expect(ctx.needsNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pump occlusion alarm!',
        message: expect.stringContaining('occlusion'),
        priority: NotificationPriority.URGENT,
      }),
    );
    expect(ctx.complete).toHaveBeenCalled();
  });

  it('fails on unexpected error', async () => {
    nightscout.getLatestPumpOcclusion.mockRejectedValue(
      new Error('fetch failed'),
    );
    await job.execute();
    expect(ctx.error).toHaveBeenCalledWith(
      expect.stringContaining('fetch failed'),
    );
    expect(ctx.fail).toHaveBeenCalled();
  });

  it('falls back to "Unknown error" when a non-Error is thrown', async () => {
    nightscout.getLatestPumpOcclusion.mockRejectedValue(null);
    await job.execute();
    expect(ctx.error).toHaveBeenCalledWith('Unknown error');
    expect(ctx.fail).toHaveBeenCalled();
  });

  it('creates execution with correct key', async () => {
    nightscout.getLatestPumpOcclusion.mockResolvedValue(false);
    await job.execute();
    expect(jobExecutionService.create).toHaveBeenCalledWith(
      PUMP_OCCLUSION_JOB_KEY,
    );
  });
});

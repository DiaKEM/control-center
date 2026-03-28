import { PumpAgeJob, PUMP_AGE_JOB_KEY } from './pump-age.job';
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

describe('PumpAgeJob', () => {
  let job: PumpAgeJob;
  let nightscout: { getLastPumpChange: jest.Mock };
  let jobConfigService: { findNextLower: jest.Mock };
  let jobExecutionService: { create: jest.Mock };
  let ctx: ReturnType<typeof makeCtx>;

  beforeEach(() => {
    ctx = makeCtx();
    nightscout = { getLastPumpChange: jest.fn() };
    jobConfigService = { findNextLower: jest.fn() };
    jobExecutionService = { create: jest.fn().mockResolvedValue(ctx) };
    job = new PumpAgeJob(
      nightscout as any,
      jobConfigService as any,
      jobExecutionService as any,
    );
  });

  it('skips when no pump change found', async () => {
    nightscout.getLastPumpChange.mockResolvedValue(null);
    await job.execute();
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('No pump change'));
    expect(ctx.skipped).toHaveBeenCalled();
  });

  it('skips when elapsedDays is undefined', async () => {
    nightscout.getLastPumpChange.mockResolvedValue({ treatment: {}, elapsedDays: undefined });
    await job.execute();
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('no elapsed days'));
    expect(ctx.skipped).toHaveBeenCalled();
  });

  it('completes without notification when no config matches', async () => {
    nightscout.getLastPumpChange.mockResolvedValue({ treatment: {}, elapsedDays: 1.5 });
    jobConfigService.findNextLower.mockResolvedValue(null);
    await job.execute();
    expect(ctx.setCurrentValue).toHaveBeenCalledWith('1.50');
    expect(ctx.info).toHaveBeenCalledWith(expect.stringContaining('No configuration matches'));
    expect(ctx.complete).toHaveBeenCalled();
    expect(ctx.needsNotification).not.toHaveBeenCalled();
  });

  it('notifies and warns when pump age exceeds threshold', async () => {
    nightscout.getLastPumpChange.mockResolvedValue({ treatment: {}, elapsedDays: 5.0 });
    const config = makeConfig(3);
    jobConfigService.findNextLower.mockResolvedValue(config);
    await job.execute();
    expect(ctx.setJobConfiguration).toHaveBeenCalledWith(config);
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('exceeds threshold'));
    expect(ctx.needsNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Pump age alarm!',
      message: expect.stringContaining('5.00d'),
    }));
    expect(ctx.complete).toHaveBeenCalled();
  });

  it('notifies with info when pump age is below threshold', async () => {
    nightscout.getLastPumpChange.mockResolvedValue({ treatment: {}, elapsedDays: 2.0 });
    const config = makeConfig(3);
    jobConfigService.findNextLower.mockResolvedValue(config);
    await job.execute();
    expect(ctx.info).toHaveBeenCalledWith(expect.stringContaining('below threshold'));
    expect(ctx.needsNotification).toHaveBeenCalled();
    expect(ctx.complete).toHaveBeenCalled();
  });

  it('fails on unexpected error', async () => {
    nightscout.getLastPumpChange.mockRejectedValue(new Error('timeout'));
    await job.execute();
    expect(ctx.error).toHaveBeenCalledWith(expect.stringContaining('timeout'));
    expect(ctx.fail).toHaveBeenCalled();
  });

  it('creates execution with correct key', async () => {
    nightscout.getLastPumpChange.mockResolvedValue(null);
    await job.execute();
    expect(jobExecutionService.create).toHaveBeenCalledWith(PUMP_AGE_JOB_KEY);
  });
});

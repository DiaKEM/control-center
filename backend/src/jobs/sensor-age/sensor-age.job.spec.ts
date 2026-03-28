import { SensorAgeJob, SENSOR_AGE_JOB_KEY } from './sensor-age.job';
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
  provider: ['telegram'],
});

describe('SensorAgeJob', () => {
  let job: SensorAgeJob;
  let nightscout: { getLastSensorChange: jest.Mock };
  let jobConfigService: { findNextLower: jest.Mock };
  let jobExecutionService: { create: jest.Mock };
  let ctx: ReturnType<typeof makeCtx>;

  beforeEach(() => {
    ctx = makeCtx();
    nightscout = { getLastSensorChange: jest.fn() };
    jobConfigService = { findNextLower: jest.fn() };
    jobExecutionService = { create: jest.fn().mockResolvedValue(ctx) };
    job = new SensorAgeJob(
      nightscout as any,
      jobConfigService as any,
      jobExecutionService as any,
    );
  });

  it('skips when no sensor change found', async () => {
    nightscout.getLastSensorChange.mockResolvedValue(null);
    await job.execute();
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('No sensor change'));
    expect(ctx.skipped).toHaveBeenCalled();
  });

  it('completes without notification when no config matches', async () => {
    nightscout.getLastSensorChange.mockResolvedValue({ treatment: {}, elapsedDays: 1.0 });
    jobConfigService.findNextLower.mockResolvedValue(null);
    await job.execute();
    expect(ctx.setCurrentValue).toHaveBeenCalledWith('1.00');
    expect(ctx.info).toHaveBeenCalledWith(expect.stringContaining('No configuration matches'));
    expect(ctx.complete).toHaveBeenCalled();
    expect(ctx.needsNotification).not.toHaveBeenCalled();
  });

  it('notifies and warns when sensor age exceeds threshold', async () => {
    nightscout.getLastSensorChange.mockResolvedValue({ treatment: {}, elapsedDays: 14.5 });
    const config = makeConfig(10);
    jobConfigService.findNextLower.mockResolvedValue(config);
    await job.execute();
    expect(ctx.setJobConfiguration).toHaveBeenCalledWith(config);
    expect(ctx.warn).toHaveBeenCalledWith(expect.stringContaining('exceeds threshold'));
    expect(ctx.needsNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Sensor age alarm!',
      message: expect.stringContaining('14.50d'),
    }));
    expect(ctx.complete).toHaveBeenCalled();
  });

  it('notifies with info when sensor age is below threshold', async () => {
    nightscout.getLastSensorChange.mockResolvedValue({ treatment: {}, elapsedDays: 5.0 });
    const config = makeConfig(10);
    jobConfigService.findNextLower.mockResolvedValue(config);
    await job.execute();
    expect(ctx.info).toHaveBeenCalledWith(expect.stringContaining('below threshold'));
    expect(ctx.needsNotification).toHaveBeenCalled();
    expect(ctx.complete).toHaveBeenCalled();
  });

  it('fails on unexpected error', async () => {
    nightscout.getLastSensorChange.mockRejectedValue(new Error('fetch failed'));
    await job.execute();
    expect(ctx.error).toHaveBeenCalledWith(expect.stringContaining('fetch failed'));
    expect(ctx.fail).toHaveBeenCalled();
  });

  it('creates execution with correct key', async () => {
    nightscout.getLastSensorChange.mockResolvedValue(null);
    await job.execute();
    expect(jobExecutionService.create).toHaveBeenCalledWith(SENSOR_AGE_JOB_KEY);
  });
});

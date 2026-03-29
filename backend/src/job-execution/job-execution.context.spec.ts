import { JobExecutionContext } from './job-execution.context';
import { LogLevel } from '../log/log.schema';
import { NotificationPriority } from '../job-configuration/job-configuration.schema';

const makeExec = jest.fn().mockResolvedValue(undefined);
const makeChain = () => ({ exec: makeExec });

describe('JobExecutionContext', () => {
  let model: {
    findOne: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  let document: { _id: { toString: () => string } };
  let ctx: JobExecutionContext;

  beforeEach(() => {
    makeExec.mockResolvedValue(undefined);
    model = {
      findOne: jest.fn().mockReturnValue(makeChain()),
      findByIdAndUpdate: jest.fn().mockReturnValue(makeChain()),
    };
    document = { _id: { toString: () => 'doc-id' } };
    ctx = new JobExecutionContext(document as any, model as any);
  });

  describe('get()', () => {
    it('returns the document when found', async () => {
      const found = { _id: 'doc-id', status: 'running' };
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(found),
      });
      const result = await ctx.get();
      expect(result).toBe(found);
      expect(model.findOne).toHaveBeenCalledWith({ _id: 'doc-id' });
    });

    it('throws when document not found', async () => {
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(ctx.get()).rejects.toThrow(
        'Job execution not found: doc-id',
      );
    });
  });

  describe('logging', () => {
    it('info() pushes INFO log', async () => {
      await ctx.info('test info');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'doc-id',
        expect.objectContaining({
          $push: {
            logs: expect.objectContaining({
              level: LogLevel.INFO,
              message: 'test info',
            }),
          },
        }),
      );
    });

    it('warn() pushes WARNING log', async () => {
      await ctx.warn('test warn');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'doc-id',
        expect.objectContaining({
          $push: { logs: expect.objectContaining({ level: LogLevel.WARNING }) },
        }),
      );
    });

    it('error() pushes ERROR log', async () => {
      await ctx.error('test error');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'doc-id',
        expect.objectContaining({
          $push: { logs: expect.objectContaining({ level: LogLevel.ERROR }) },
        }),
      );
    });
  });

  describe('field setters', () => {
    it('setCurrentValue() updates the field', async () => {
      await ctx.setCurrentValue('42');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('doc-id', {
        $set: { currentValue: '42' },
      });
    });

    it('setStatus() updates status', async () => {
      await ctx.setStatus('success');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('doc-id', {
        $set: { status: 'success' },
      });
    });

    it('setJobConfiguration() updates configuration', async () => {
      const config = { threshold: 3 } as any;
      await ctx.setJobConfiguration(config);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('doc-id', {
        $set: { jobConfiguration: config },
      });
    });

    it('setNotificationSent() sets notificationSentAt', async () => {
      await ctx.setNotificationSent();
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('doc-id', {
        $set: { notificationSentAt: expect.any(Date) },
      });
    });
  });

  describe('completion', () => {
    it('complete() sets status to success', async () => {
      await ctx.complete();
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('doc-id', {
        $set: { status: 'success', finishedAt: expect.any(Date) },
      });
    });

    it('fail() sets status to failed', async () => {
      await ctx.fail();
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('doc-id', {
        $set: { status: 'failed', finishedAt: expect.any(Date) },
      });
    });

    it('skipped() sets status to skipped', async () => {
      await ctx.skipped();
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('doc-id', {
        $set: { status: 'skipped', finishedAt: expect.any(Date) },
      });
    });

    it('needsNotification() sets notification payload', async () => {
      const payload = {
        title: 'Alert',
        message: 'msg',
        priority: NotificationPriority.HIGH,
      };
      await ctx.needsNotification(payload);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('doc-id', {
        $set: { needsNotification: true, notification: payload },
      });
    });
  });
});

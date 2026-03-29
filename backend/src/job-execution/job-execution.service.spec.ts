import { JobExecutionService } from './job-execution.service';
import { JobExecutionContext } from './job-execution.context';

describe('JobExecutionService', () => {
  let service: JobExecutionService;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };

  const execFn = jest.fn();
  const limitFn = jest.fn().mockReturnValue({ exec: execFn });
  const sortFn = jest.fn().mockReturnValue({ limit: limitFn });
  const sortFnSingle = jest.fn().mockReturnValue({ exec: execFn });

  beforeEach(() => {
    execFn.mockResolvedValue([]);
    model = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({ sort: sortFn }),
      findOne: jest.fn().mockReturnValue({ sort: sortFnSingle }),
    };
    service = new JobExecutionService(model as any);
  });

  describe('create()', () => {
    it('creates a document and returns a JobExecutionContext', async () => {
      const doc = { _id: { toString: () => 'id-1' }, status: 'running' };
      model.create.mockResolvedValue(doc);
      const result = await service.create('pump-age');
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobTypeKey: 'pump-age',
          status: 'running',
          needsNotification: false,
          logs: [],
        }),
      );
      expect(result).toBeInstanceOf(JobExecutionContext);
    });
  });

  describe('find()', () => {
    it('queries with no filters', async () => {
      execFn.mockResolvedValue([{ _id: '1' }]);
      const result = await service.find();
      expect(model.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
    });

    it('applies jobTypeKey filter', async () => {
      await service.find({ jobTypeKey: 'battery-level' });
      expect(model.find).toHaveBeenCalledWith({ jobTypeKey: 'battery-level' });
    });

    it('applies status filter', async () => {
      await service.find({ status: 'success' });
      expect(model.find).toHaveBeenCalledWith({ status: 'success' });
    });

    it('applies needsNotification filter', async () => {
      await service.find({ needsNotification: true });
      expect(model.find).toHaveBeenCalledWith({ needsNotification: true });
    });

    it('applies jobConfiguration filter', async () => {
      await service.find({ jobConfiguration: 'cfg-id' });
      expect(model.find).toHaveBeenCalledWith({
        'jobConfiguration.id': 'cfg-id',
      });
    });

    it('applies from/to date filter', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      await service.find({ from, to });
      expect(model.find).toHaveBeenCalledWith({
        startedAt: { $gte: from, $lte: to },
      });
    });

    it('applies from-only date filter', async () => {
      const from = new Date('2024-01-01');
      await service.find({ from });
      expect(model.find).toHaveBeenCalledWith({
        startedAt: { $gte: from },
      });
    });

    it('applies to-only date filter', async () => {
      const to = new Date('2024-12-31');
      await service.find({ to });
      expect(model.find).toHaveBeenCalledWith({
        startedAt: { $lte: to },
      });
    });

    it('applies custom limit', async () => {
      await service.find({ limit: 5 });
      expect(limitFn).toHaveBeenCalledWith(5);
    });
  });

  describe('findLastJobExecution()', () => {
    it('queries by jobTypeKey and jobConfiguration', async () => {
      const doc = { _id: 'exec-1' };
      execFn.mockResolvedValue(doc);
      model.findOne.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
      });
      const result = await service.findLastJobExecution('pump-age', 'cfg-1');
      expect(model.findOne).toHaveBeenCalledWith({
        jobTypeKey: 'pump-age',
        'jobConfiguration._id': 'cfg-1',
      });
      expect(result).toBe(doc);
    });
  });

  describe('findByJobType()', () => {
    it('delegates to find with jobTypeKey', async () => {
      const spy = jest.spyOn(service, 'find').mockResolvedValue([]);
      await service.findByJobType('sensor-age');
      expect(spy).toHaveBeenCalledWith({ jobTypeKey: 'sensor-age' });
    });
  });

  describe('findLatest()', () => {
    it('delegates to find with default limit 20', async () => {
      const spy = jest.spyOn(service, 'find').mockResolvedValue([]);
      await service.findLatest();
      expect(spy).toHaveBeenCalledWith({ limit: 20 });
    });

    it('delegates to find with custom limit', async () => {
      const spy = jest.spyOn(service, 'find').mockResolvedValue([]);
      await service.findLatest(5);
      expect(spy).toHaveBeenCalledWith({ limit: 5 });
    });
  });
});

import { JobConfigurationService } from './job-configuration.service';

describe('JobConfigurationService', () => {
  let service: JobConfigurationService;
  let model: {
    find: jest.Mock;
    create: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
    findOne: jest.Mock;
  };

  const exec = jest.fn();
  const sortChain = jest.fn().mockReturnValue({ exec });

  beforeEach(() => {
    exec.mockResolvedValue(null);
    model = {
      find: jest.fn().mockReturnValue({ exec }),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn().mockReturnValue({ exec }),
      findByIdAndDelete: jest.fn().mockReturnValue({ exec }),
      findOne: jest.fn().mockReturnValue({ sort: sortChain }),
    };
    service = new JobConfigurationService(model as any);
  });

  describe('findAll()', () => {
    it('returns all configurations', async () => {
      const docs = [{ _id: '1' }, { _id: '2' }];
      exec.mockResolvedValue(docs);
      const result = await service.findAll();
      expect(model.find).toHaveBeenCalledWith();
      expect(result).toBe(docs);
    });
  });

  describe('findByJobTypeKey()', () => {
    it('filters by job type key', async () => {
      exec.mockResolvedValue([]);
      await service.findByJobTypeKey('pump-age');
      expect(model.find).toHaveBeenCalledWith({ jobTypeKey: 'pump-age' });
    });
  });

  describe('create()', () => {
    it('creates and returns a new document', async () => {
      const data = { jobTypeKey: 'pump-age', threshold: 3 } as any;
      const created = { _id: 'new-id', ...data };
      model.create.mockResolvedValue(created);
      const result = await service.create(data);
      expect(model.create).toHaveBeenCalledWith(data);
      expect(result).toBe(created);
    });
  });

  describe('update()', () => {
    it('calls findByIdAndUpdate with $set and new:true', async () => {
      const updated = { _id: '1', threshold: 5 };
      exec.mockResolvedValue(updated);
      const result = await service.update('1', { threshold: 5 });
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        { $set: { threshold: 5 } },
        { new: true },
      );
      expect(result).toBe(updated);
    });
  });

  describe('delete()', () => {
    it('calls findByIdAndDelete', async () => {
      exec.mockResolvedValue(undefined);
      await service.delete('1');
      expect(model.findByIdAndDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('findFirst()', () => {
    it('returns the first config for a job type', async () => {
      const doc = { jobTypeKey: 'pump-occlusion' };
      model.findOne.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
        exec: jest.fn().mockResolvedValue(doc),
      });
      const result = await service.findFirst('pump-occlusion');
      expect(model.findOne).toHaveBeenCalledWith({
        jobTypeKey: 'pump-occlusion',
      });
      expect(result).toBe(doc);
    });

    it('returns null when no config exists', async () => {
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await service.findFirst('pump-occlusion');
      expect(result).toBeNull();
    });
  });

  describe('findNextLower()', () => {
    it('queries threshold <= currentValue, sorts descending', async () => {
      const doc = { threshold: 4 };
      exec.mockResolvedValue(doc);
      const result = await service.findNextLower('pump-age', 5);
      expect(model.findOne).toHaveBeenCalledWith({
        jobTypeKey: 'pump-age',
        threshold: { $lte: 5 },
      });
      expect(sortChain).toHaveBeenCalledWith({ threshold: -1 });
      expect(result).toBe(doc);
    });

    it('returns null when no match', async () => {
      exec.mockResolvedValue(null);
      const result = await service.findNextLower('pump-age', 1);
      expect(result).toBeNull();
    });
  });

  describe('findNextHigher()', () => {
    it('queries threshold > currentValue, sorts ascending', async () => {
      const doc = { threshold: 30 };
      exec.mockResolvedValue(doc);
      const result = await service.findNextHigher('battery-level', 20);
      expect(model.findOne).toHaveBeenCalledWith({
        jobTypeKey: 'battery-level',
        threshold: { $gt: 20 },
      });
      expect(sortChain).toHaveBeenCalledWith({ threshold: 1 });
      expect(result).toBe(doc);
    });

    it('returns null when no match', async () => {
      exec.mockResolvedValue(null);
      const result = await service.findNextHigher('battery-level', 100);
      expect(result).toBeNull();
    });
  });
});

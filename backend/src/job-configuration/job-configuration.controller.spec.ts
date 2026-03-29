import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobConfigurationController } from './job-configuration.controller';

describe('JobConfigurationController', () => {
  let controller: JobConfigurationController;
  let service: {
    findAll: jest.Mock;
    findByJobTypeKey: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let jobTypeRegistry: { getRegisteredKeys: jest.Mock };

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findByJobTypeKey: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    jobTypeRegistry = {
      getRegisteredKeys: jest
        .fn()
        .mockReturnValue(['pump-age', 'battery-level']),
    };
    controller = new JobConfigurationController(
      service as any,
      jobTypeRegistry as any,
    );
  });

  describe('findAll()', () => {
    it('returns all configurations when no filter', async () => {
      const docs = [{ _id: '1' }];
      service.findAll.mockResolvedValue(docs);
      const result = await controller.findAll(undefined);
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBe(docs);
    });

    it('filters by jobTypeKey when provided', async () => {
      const docs = [{ _id: '2' }];
      service.findByJobTypeKey.mockResolvedValue(docs);
      const result = await controller.findAll('pump-age');
      expect(service.findByJobTypeKey).toHaveBeenCalledWith('pump-age');
      expect(result).toBe(docs);
    });
  });

  describe('create()', () => {
    it('creates a configuration for a valid job type', async () => {
      const body = { jobTypeKey: 'pump-age', threshold: 3 } as any;
      const created = { _id: 'new', ...body };
      service.create.mockResolvedValue(created);
      const result = await controller.create(body);
      expect(service.create).toHaveBeenCalledWith(body);
      expect(result).toBe(created);
    });

    it('throws BadRequestException for unknown job type', () => {
      const body = { jobTypeKey: 'unknown-type', threshold: 3 } as any;
      expect(() => controller.create(body)).toThrow(BadRequestException);
    });
  });

  describe('update()', () => {
    it('updates and returns the document', async () => {
      const updated = { _id: '1', threshold: 5 };
      service.update.mockResolvedValue(updated);
      const result = await controller.update('1', { threshold: 5 } as any);
      expect(service.update).toHaveBeenCalledWith('1', { threshold: 5 });
      expect(result).toBe(updated);
    });

    it('throws NotFoundException when document not found', async () => {
      service.update.mockResolvedValue(null);
      await expect(controller.update('nonexistent', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when updating to unknown jobTypeKey', async () => {
      await expect(
        controller.update('1', { jobTypeKey: 'unknown-type' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows updating with a valid jobTypeKey', async () => {
      const updated = { _id: '1', jobTypeKey: 'battery-level' };
      service.update.mockResolvedValue(updated);
      const result = await controller.update('1', {
        jobTypeKey: 'battery-level',
      } as any);
      expect(result).toBe(updated);
    });

    it('skips jobTypeKey validation when jobTypeKey is not in the update', async () => {
      const updated = { _id: '1', threshold: 10 };
      service.update.mockResolvedValue(updated);
      const result = await controller.update('1', { threshold: 10 } as any);
      expect(jobTypeRegistry.getRegisteredKeys).not.toHaveBeenCalled();
      expect(result).toBe(updated);
    });
  });

  describe('delete()', () => {
    it('calls service.delete with the id', async () => {
      service.delete.mockResolvedValue(undefined);
      await controller.delete('del-id');
      expect(service.delete).toHaveBeenCalledWith('del-id');
    });
  });
});

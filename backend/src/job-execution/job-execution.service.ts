import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ExecutionStatus,
  JobExecution,
  JobExecutionDocument,
} from './job-execution.schema';
import { JobExecutionContext } from './job-execution.context';

@Injectable()
export class JobExecutionService {
  constructor(
    @InjectModel(JobExecution.name)
    private readonly model: Model<JobExecutionDocument>,
  ) {}

  async create(jobTypeKey: string): Promise<JobExecutionContext> {
    const document = await this.model.create({
      jobTypeKey,
      startedAt: new Date(),
      status: 'running',
      needsNotification: false,
      logs: [],
    });
    return new JobExecutionContext(document, this.model);
  }

  find(
    filter: {
      jobTypeKey?: string;
      jobConfiguration?: string;
      status?: ExecutionStatus;
      needsNotification?: boolean;
      from?: Date;
      to?: Date;
      limit?: number;
    } = {},
  ): Promise<JobExecutionDocument[]> {
    const query: Record<string, unknown> = {};

    if (filter.jobTypeKey) query['jobTypeKey'] = filter.jobTypeKey;
    if (filter.status) query['status'] = filter.status;
    if (filter.jobConfiguration)
      query['jobConfiguration.id'] = filter.jobConfiguration;
    if (filter.needsNotification !== undefined)
      query['needsNotification'] = filter.needsNotification;
    if (filter.from || filter.to) {
      query['startedAt'] = {
        ...(filter.from && { $gte: filter.from }),
        ...(filter.to && { $lte: filter.to }),
      };
    }

    return this.model
      .find(query)
      .sort({ startedAt: -1 })
      .limit(filter.limit ?? 100)
      .exec();
  }

  findLastJobExecution(
    jobTypeKey: string,
    jobConfiguration: string,
  ): Promise<JobExecutionDocument | null> {
    return this.model
      .findOne({ jobTypeKey, 'jobConfiguration._id': jobConfiguration })
      .sort({ startedAt: -1 })
      .exec();
  }

  findByJobType(jobTypeKey: string): Promise<JobExecutionDocument[]> {
    return this.find({ jobTypeKey });
  }

  findLatest(limit = 20): Promise<JobExecutionDocument[]> {
    return this.find({ limit });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.model
      .deleteMany({ startedAt: { $lt: date } })
      .exec();
    return result.deletedCount;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  async deleteFiltered(
    filter: {
      jobTypeKey?: string;
      status?: ExecutionStatus;
      from?: Date;
      to?: Date;
    } = {},
  ): Promise<number> {
    const query: Record<string, unknown> = {};
    if (filter.jobTypeKey) query['jobTypeKey'] = filter.jobTypeKey;
    if (filter.status) query['status'] = filter.status;
    if (filter.from || filter.to) {
      query['startedAt'] = {
        ...(filter.from && { $gte: filter.from }),
        ...(filter.to && { $lte: filter.to }),
      };
    }
    const result = await this.model.deleteMany(query).exec();
    return result.deletedCount;
  }
}

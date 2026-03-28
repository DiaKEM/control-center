import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  JobConfiguration,
  JobConfigurationDocument,
} from './job-configuration.schema';

@Injectable()
export class JobConfigurationService {
  constructor(
    @InjectModel(JobConfiguration.name)
    private readonly model: Model<JobConfigurationDocument>,
  ) {}

  findAll(): Promise<JobConfigurationDocument[]> {
    return this.model.find().exec();
  }

  findByJobTypeKey(jobTypeKey: string): Promise<JobConfigurationDocument[]> {
    return this.model.find({ jobTypeKey }).exec();
  }

  findFirst(jobTypeKey: string): Promise<JobConfigurationDocument | null> {
    return this.model.findOne({ jobTypeKey }).exec();
  }

  create(
    data: Omit<JobConfiguration, never>,
  ): Promise<JobConfigurationDocument> {
    return this.model.create(data);
  }

  update(
    id: string,
    data: Partial<JobConfiguration>,
  ): Promise<JobConfigurationDocument | null> {
    return this.model
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  /**
   * Returns the most specific configuration that applies to the given value:
   * the one with the highest threshold that is still <= currentValue,
   * scoped by jobTypeKey and thresholdUnit.
   *
   * Example: currentValue=5, unit='days', configs=[2d, 4d] → returns 4d config.
   */
  findNextLower(
    jobTypeKey: string,
    currentValue: number,
  ): Promise<JobConfigurationDocument | null> {
    return this.model
      .findOne({
        jobTypeKey,
        threshold: { $lte: currentValue },
      })
      .sort({ threshold: -1 })
      .exec();
  }

  findNextHigher(
    jobTypeKey: string,
    currentValue: number,
  ): Promise<JobConfigurationDocument | null> {
    return this.model
      .findOne({
        jobTypeKey,
        threshold: { $gt: currentValue },
      })
      .sort({ threshold: 1 })
      .exec();
  }
}

import { Model } from 'mongoose';
import { JobConfiguration } from '../job-configuration/job-configuration.schema';
import { LogLevel } from '../log/log.schema';
import * as jobExecutionSchema from './job-execution.schema';
import { InjectModel } from '@nestjs/mongoose';
import { NotificatorPayload } from '../notificator/notificator-provider-base';
import { JobExecution, JobExecutionDocument } from './job-execution.schema';

export class JobExecutionContext {
  constructor(
    readonly document: jobExecutionSchema.JobExecutionDocument,
    @InjectModel(jobExecutionSchema.JobExecution.name)
    private readonly model: Model<jobExecutionSchema.JobExecutionDocument>,
  ) {}

  private get id(): string {
    return this.document._id.toString();
  }

  async get(): Promise<JobExecutionDocument> {
    const doc = await this.model.findOne({ _id: this.id }).exec();

    if (!doc) {
      throw new Error(`Job execution not found: ${this.id}`);
    }

    return doc;
  }

  // ── Logging ────────────────────────────────────────────────────────────────

  async info(message: string): Promise<void> {
    await this.pushLog(LogLevel.INFO, message);
  }

  async warn(message: string): Promise<void> {
    await this.pushLog(LogLevel.WARNING, message);
  }

  async error(message: string): Promise<void> {
    await this.pushLog(LogLevel.ERROR, message);
  }

  // ── Fields ─────────────────────────────────────────────────────────────────

  async setCurrentValue(currentValue: string): Promise<void> {
    await this.model
      .findByIdAndUpdate(this.id, { $set: { currentValue } })
      .exec();
  }

  async setStatus(status: jobExecutionSchema.ExecutionStatus): Promise<void> {
    await this.model.findByIdAndUpdate(this.id, { $set: { status } }).exec();
  }

  async setJobConfiguration(jobConfiguration: JobConfiguration): Promise<void> {
    await this.model
      .findByIdAndUpdate(this.id, { $set: { jobConfiguration } })
      .exec();
  }

  async setNotificationSent(): Promise<void> {
    await this.model
      .findByIdAndUpdate(this.id, { $set: { notificationSentAt: new Date() } })
      .exec();
  }

  // ── Completion ─────────────────────────────────────────────────────────────

  async complete(): Promise<void> {
    await this.model
      .findByIdAndUpdate(this.id, {
        $set: { status: 'success', finishedAt: new Date() },
      })
      .exec();
  }

  async fail(): Promise<void> {
    await this.model
      .findByIdAndUpdate(this.id, {
        $set: { status: 'failed', finishedAt: new Date() },
      })
      .exec();
  }

  async skipped(): Promise<void> {
    await this.model
      .findByIdAndUpdate(this.id, {
        $set: { status: 'skipped', finishedAt: new Date() },
      })
      .exec();
  }

  async needsNotification(notification: NotificatorPayload): Promise<void> {
    await this.model
      .findByIdAndUpdate(this.id, {
        $set: { needsNotification: true, notification },
      })
      .exec();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async pushLog(level: LogLevel, message: string): Promise<void> {
    const log = { timestamp: new Date(), level, message };
    await this.model
      .findByIdAndUpdate(this.id, { $push: { logs: log } })
      .exec();
  }
}

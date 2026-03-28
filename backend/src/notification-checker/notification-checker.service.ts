import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationConfig } from '../job-configuration/job-configuration.schema';
import {
  JobExecution,
  JobExecutionDocument,
} from '../job-execution/job-execution.schema';

const TIME_POINT_WINDOW_MS = 3 * 60 * 1000; // ±10 minutes

@Injectable()
export class NotificationCheckerService {
  private readonly logger = new Logger(NotificationCheckerService.name);
  constructor(
    @InjectModel(JobExecution.name)
    private readonly model: Model<JobExecutionDocument>,
  ) {}

  /**
   * Evaluates each NotificationConfig of the execution's jobConfiguration
   * and returns those that are currently due for a notification.
   */
  async check(execution: JobExecutionDocument): Promise<NotificationConfig[]> {
    const config = execution.jobConfiguration;
    if (!config?.notifications?.length) return [];

    const lastSentAt = await this.findLastNotificationSentAt(
      execution.jobTypeKey,
      (config as unknown as { _id?: unknown })._id?.toString(),
    );

    return config.notifications.filter((n) => {
      if (n.intervalHours !== undefined) {
        return this.isIntervalDue(n.intervalHours, lastSentAt);
      }
      if (n.timePoint !== undefined) {
        return this.isTimePointDue(n.timePoint, lastSentAt);
      }
      return false;
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async findLastNotificationSentAt(
    jobTypeKey: string,
    jobConfigurationId?: string,
  ): Promise<Date | undefined> {
    const query: Record<string, unknown> = {
      jobTypeKey,
      notificationSentAt: { $exists: true },
    };
    if (jobConfigurationId) {
      query['jobConfiguration._id'] = jobConfigurationId;
    }

    const last = await this.model
      .findOne(query)
      .sort({ notificationSentAt: -1 })
      .exec();

    return last?.notificationSentAt ?? undefined;
  }

  private isIntervalDue(intervalHours: number, lastSentAt?: Date): boolean {
    if (!lastSentAt) return true;
    const elapsed = Date.now() - lastSentAt.getTime();
    return elapsed >= intervalHours * 60 * 60 * 1000;
  }

  private isTimePointDue(timePoint: string, lastSentAt?: Date): boolean {
    const [h, m] = timePoint.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);

    const nowDiff = Math.abs(Date.now() - target.getTime());
    if (nowDiff > TIME_POINT_WINDOW_MS) return false; // outside the ±10 min window

    if (!lastSentAt) return true;
    const lastDiff = Math.abs(lastSentAt.getTime() - target.getTime());
    return lastDiff > TIME_POINT_WINDOW_MS; // sent outside this window → due again
  }
}

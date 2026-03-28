import { Injectable, Logger } from '@nestjs/common';
import { JobTypeRegistryService } from '../job-type/job-type-registry.service';
import { JobTypeKey } from '../job-type/job-type.registry';
import { NotificationManagerService } from '../notification-manager/notification-manager.service';
import { NotificationCheckerService } from '../notification-checker/notification-checker.service';

@Injectable()
export class JobManagerService {
  private readonly logger = new Logger(JobManagerService.name);

  constructor(
    private readonly jobTypeRegistry: JobTypeRegistryService,
    private readonly notificationManager: NotificationManagerService,
    private readonly notificationChecker: NotificationCheckerService,
  ) {}

  async runAll(): Promise<void> {
    const keys = this.jobTypeRegistry.getRegisteredKeys();
    this.logger.log(`Running all job types: ${keys.join(', ')}`);
    await Promise.all(keys.map((key) => this.run(key)));
  }

  async run(key: JobTypeKey): Promise<void> {
    try {
      const job = this.jobTypeRegistry.resolve(key);
      const ctx = await job.execute();
      const jobContext = await ctx.get();
      this.logger.log(
        `Job "${key}" completed with status "${jobContext.status}" — ${jobContext.logs.length} log(s)`,
      );

      if (!jobContext.needsNotification) {
        this.logger.log(`Job "${key}" did not need notification`);
        return;
      }

      const jobConfiguration = jobContext.jobConfiguration;
      if (!jobConfiguration) {
        this.logger.warn(
          `Job "${key}" did not have a notification configuration`,
        );
        return;
      }

      if (!jobContext.notification) {
        this.logger.warn(`Job "${key}" did not have a notification payload`);
        return;
      }

      const dueNotifications = await this.notificationChecker.check(jobContext);
      if (!dueNotifications.length) {
        this.logger.log(`Job "${key}" notification not due yet — skipping`);
        return;
      }
      this.logger.log(`Handling ${JSON.stringify(dueNotifications)} now...`);

      await this.notificationManager.sendMessage(
        jobConfiguration.provider,
        jobContext.notification,
      );
      await ctx.setNotificationSent();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job "${key}" threw an unhandled error: ${message}`);
    }
  }
}

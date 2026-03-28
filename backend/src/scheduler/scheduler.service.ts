import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { JobManagerService } from '../job-manager/job-manager.service';
import { AdminSettingsService } from '../admin/admin-settings.service';

export const DEFAULT_CRON = '0 */15 * * * *';
const JOB_NAME = 'run-all';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly jobManager: JobManagerService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly config: ConfigService,
    private readonly adminSettings: AdminSettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reinitialize();
  }

  async reinitialize(expression?: string): Promise<void> {
    const effectiveExpression =
      expression ??
      (await this.adminSettings.getSettings('scheduler'))?.expression ??
      this.config.get<string>('CRON_SCHEDULE', DEFAULT_CRON);

    // Replace any existing job
    try {
      this.schedulerRegistry.getCronJob(JOB_NAME).stop();
      this.schedulerRegistry.deleteCronJob(JOB_NAME);
    } catch {
      // Job didn't exist yet — that's fine
    }

    const job = new CronJob(effectiveExpression, async () => {
      this.logger.log('Scheduled run triggered — executing all jobs');
      await this.jobManager.runAll();
    });

    this.schedulerRegistry.addCronJob(JOB_NAME, job);
    job.start();

    this.logger.log(`Scheduler running with expression: ${effectiveExpression}`);
  }

  getEffectiveExpression(): string {
    try {
      // CronJob doesn't expose the pattern directly, so read from the registry
      const job = this.schedulerRegistry.getCronJob(JOB_NAME);
      return (job as unknown as { cronTime: { source: string } }).cronTime.source;
    } catch {
      return DEFAULT_CRON;
    }
  }

  getNextRunDate(): Date | null {
    try {
      return this.schedulerRegistry.getCronJob(JOB_NAME).nextDate().toJSDate();
    } catch {
      return null;
    }
  }
}

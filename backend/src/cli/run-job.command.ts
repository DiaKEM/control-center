import { Command, CommandRunner } from 'nest-commander';
import { JobManagerService } from '../job-manager/job-manager.service';
import { JobTypeKey } from '../job-type/job-type.registry';

@Command({
  name: 'run',
  arguments: '<jobTypeKey>',
  description: 'Run a specific job type by its key (e.g. pump-age)',
})
export class RunJobCommand extends CommandRunner {
  /* c8 ignore next */
  constructor(private readonly jobManager: JobManagerService) {
    super();
  }

  async run([jobTypeKey]: string[]): Promise<void> {
    await this.jobManager.run(jobTypeKey as JobTypeKey);
  }
}

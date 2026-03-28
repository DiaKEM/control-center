import { Command, CommandRunner } from 'nest-commander';
import { JobManagerService } from '../job-manager/job-manager.service';

@Command({
  name: 'run:all',
  description: 'Run all registered job types',
})
export class RunAllCommand extends CommandRunner {
  /* c8 ignore next */
  constructor(private readonly jobManager: JobManagerService) {
    super();
  }

  async run(): Promise<void> {
    await this.jobManager.runAll();
  }
}

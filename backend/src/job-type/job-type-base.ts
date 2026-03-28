import { JobExecutionContext } from '../job-execution/job-execution.context';

export abstract class JobTypeBase {
  abstract execute(): Promise<JobExecutionContext>;
}

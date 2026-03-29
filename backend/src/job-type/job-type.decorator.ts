import { JobTypeBase } from './job-type-base';
import { JobTypeKey, JOB_TYPE_STORE } from './job-type.registry';

export function JobType(key: JobTypeKey): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    JOB_TYPE_STORE.set(key, target as typeof JobTypeBase);
  };
}

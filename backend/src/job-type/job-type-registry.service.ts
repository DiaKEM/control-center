import { Injectable, NotFoundException, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JobTypeBase } from './job-type-base';
import { JobTypeKey, JOB_TYPE_STORE } from './job-type.registry';

@Injectable()
export class JobTypeRegistryService {
  constructor(private readonly moduleRef: ModuleRef) {}

  resolve(key: JobTypeKey): JobTypeBase {
    const cls = JOB_TYPE_STORE.get(key);
    if (!cls) throw new NotFoundException(`No job type registered for key: "${key}"`);
    return this.moduleRef.get(cls as Type<JobTypeBase>, { strict: false });
  }

  getRegisteredKeys(): JobTypeKey[] {
    return Array.from(JOB_TYPE_STORE.keys());
  }
}

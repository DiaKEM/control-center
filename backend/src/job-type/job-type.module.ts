import { Module } from '@nestjs/common';
import { JobTypeRegistryService } from './job-type-registry.service';

@Module({
  providers: [JobTypeRegistryService],
  exports: [JobTypeRegistryService],
})
export class JobTypeModule {}

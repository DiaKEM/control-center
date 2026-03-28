import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobExecution, JobExecutionSchema } from './job-execution.schema';
import { JobExecutionService } from './job-execution.service';
import { JobExecutionController } from './job-execution.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobExecution.name, schema: JobExecutionSchema },
    ]),
  ],
  providers: [JobExecutionService],
  controllers: [JobExecutionController],
  exports: [JobExecutionService],
})
export class JobExecutionModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  JobExecution,
  JobExecutionSchema,
} from '../job-execution/job-execution.schema';
import { NotificationCheckerService } from './notification-checker.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobExecution.name, schema: JobExecutionSchema },
    ]),
  ],
  providers: [NotificationCheckerService],
  exports: [NotificationCheckerService],
})
export class NotificationCheckerModule {}

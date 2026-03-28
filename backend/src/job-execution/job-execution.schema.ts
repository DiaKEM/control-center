import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  JobConfiguration,
  JobConfigurationSchema,
} from '../job-configuration/job-configuration.schema';
import { Log, LogSchema } from '../log/log.schema';
import * as notificatorProviderBase from '../notificator/notificator-provider-base';

export type ExecutionStatus = 'running' | 'success' | 'failed';

@Schema({ collection: 'job_executions', timestamps: true })
export class JobExecution {
  @Prop({ required: true })
  jobTypeKey: string;

  @Prop({ type: JobConfigurationSchema })
  jobConfiguration?: JobConfiguration;

  @Prop({ type: [LogSchema], default: [] })
  logs: Log[];

  @Prop()
  currentValue: string;

  @Prop()
  needsNotification: boolean;

  @Prop()
  notificationSentAt?: Date;

  @Prop({ type: Object })
  notification?: notificatorProviderBase.NotificatorPayload;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  finishedAt?: Date;

  @Prop({
    required: true,
    enum: ['running', 'success', 'skipped', 'failed'],
    default: 'running',
  })
  status: ExecutionStatus;
}

export type JobExecutionDocument = HydratedDocument<JobExecution>;

export const JobExecutionSchema = SchemaFactory.createForClass(JobExecution);

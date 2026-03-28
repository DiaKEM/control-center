import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';
import { JOB_TYPE_KEYS } from '../job-type/job-type.registry';

export type NotificationProvider = 'pushover' | 'telegram';

export enum NotificationPriority {
  LOW = 'low',
  MID = 'mid',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ _id: false })
export class NotificationConfig {
  @ApiPropertyOptional({
    description: 'Send a notification at a fixed time of day (HH:mm)',
    example: '20:00',
  })
  @Prop()
  timePoint?: string;

  @ApiPropertyOptional({
    description: 'Send a notification once every N hours',
    example: 3,
  })
  @Prop()
  intervalHours?: number;
}

export const NotificationConfigSchema =
  SchemaFactory.createForClass(NotificationConfig);

@Schema({ collection: 'job_configurations', timestamps: true })
export class JobConfiguration {
  @ApiProperty({
    description: 'Key identifying the job type this configuration belongs to',
    enum: JOB_TYPE_KEYS,
    example: 'pump-age',
  })
  @Prop({ required: true })
  jobTypeKey: string;

  @ApiProperty({
    description: 'Threshold value (in days) that triggers a notification',
    example: 3,
  })
  @Prop({ required: true })
  threshold: number;

  @ApiProperty({
    description:
      'List of notification schedules (time-based or interval-based)',
    type: [NotificationConfig],
    example: [{ timePoint: '20:00' }, { intervalHours: 3 }],
  })
  @Prop({ type: [NotificationConfigSchema], required: true })
  notifications: NotificationConfig[];

  @ApiProperty({
    description: 'Notification providers to deliver the alert through',
    enum: ['pushover', 'telegram'],
    isArray: true,
    example: ['pushover'],
  })
  @Prop({ type: [String], required: true, enum: ['pushover', 'telegram'] })
  provider: NotificationProvider[];

  @ApiProperty({
    description: 'Severity level of the notification',
    enum: NotificationPriority,
    example: NotificationPriority.MID,
  })
  @Prop({ required: true, enum: NotificationPriority })
  priority: NotificationPriority;
}

export type JobConfigurationDocument = HydratedDocument<JobConfiguration>;

export const JobConfigurationSchema =
  SchemaFactory.createForClass(JobConfiguration);

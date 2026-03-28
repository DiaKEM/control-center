import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

@Schema({ _id: false })
export class Log {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: LogLevel })
  level: LogLevel;
}

export const LogSchema = SchemaFactory.createForClass(Log);

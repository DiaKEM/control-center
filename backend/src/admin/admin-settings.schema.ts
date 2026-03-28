import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'admin_settings', timestamps: true })
export class AdminSettings {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object, required: true })
  data: Record<string, string>;
}

export type AdminSettingsDocument = HydratedDocument<AdminSettings>;
export const AdminSettingsSchema = SchemaFactory.createForClass(AdminSettings);

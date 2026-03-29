import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminSettings, AdminSettingsDocument } from './admin-settings.schema';

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectModel(AdminSettings.name)
    private readonly model: Model<AdminSettingsDocument>,
  ) {}

  async getSettings(key: string): Promise<Record<string, string> | null> {
    const doc = await this.model.findOne({ key }).lean().exec();
    return doc?.data ?? null;
  }

  async upsertSettings(
    key: string,
    data: Record<string, string>,
  ): Promise<void> {
    await this.model
      .findOneAndUpdate(
        { key },
        { $set: { data } },
        { upsert: true, new: true },
      )
      .exec();
  }
}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSettings, AdminSettingsSchema } from './admin-settings.schema';
import { AdminSettingsService } from './admin-settings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminSettings.name, schema: AdminSettingsSchema },
    ]),
  ],
  providers: [AdminSettingsService],
  exports: [AdminSettingsService],
})
export class AdminSettingsModule {}

import { Module } from '@nestjs/common';
import { JobTypeModule } from '../job-type/job-type.module';
import { NotificationManagerModule } from '../notification-manager/notification-manager.module';
import { NotificationCheckerModule } from '../notification-checker/notification-checker.module';
import { JobManagerService } from './job-manager.service';
import { JobManagerController } from './job-manager.controller';

@Module({
  imports: [
    JobTypeModule,
    NotificationManagerModule,
    NotificationCheckerModule,
  ],
  providers: [JobManagerService],
  controllers: [JobManagerController],
  exports: [JobManagerService],
})
export class JobManagerModule {}

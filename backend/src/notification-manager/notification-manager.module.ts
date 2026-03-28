import { Module } from '@nestjs/common';
import { NotificatorModule } from '../notificator/notificator.module';
import { NotificationManagerService } from './notification-manager.service';

@Module({
  imports: [NotificatorModule],
  providers: [NotificationManagerService],
  exports: [NotificationManagerService],
})
export class NotificationManagerModule {}

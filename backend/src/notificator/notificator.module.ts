import { Module } from '@nestjs/common';
import { PushoverModule } from '../pushover/pushover.module';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificatorProviderRegistryService } from './notificator-provider-registry.service';
import { PushoverNotificatorProvider } from './providers/pushover-notificator.provider';
import { TelegramNotificatorProvider } from './providers/telegram-notificator.provider';

@Module({
  imports: [PushoverModule, TelegramModule],
  providers: [
    NotificatorProviderRegistryService,
    PushoverNotificatorProvider,
    TelegramNotificatorProvider,
  ],
  exports: [NotificatorProviderRegistryService],
})
export class NotificatorModule {}

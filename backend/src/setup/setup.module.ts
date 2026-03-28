import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [UsersModule, AuthModule],
  providers: [SetupService],
  controllers: [SetupController],
})
export class SetupModule {}

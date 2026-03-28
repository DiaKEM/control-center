import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BatteryLevelModule } from '../jobs/battery-level/battery-level.module';
import { InsulinLevelModule } from '../jobs/insulin-level/insulin-level.module';
import { SensorAgeModule } from '../jobs/sensor-age/sensor-age.module';
import { PumpOcclusionModule } from '../jobs/pump-occlusion/pump-occlusion.module';
import { JobManagerModule } from '../job-manager/job-manager.module';
import { PumpAgeModule } from '../jobs/pump-age/pump-age.module';
import { RunAllCommand } from './run-all.command';
import { RunJobCommand } from './run-job.command';
import { CreateUserCommand } from './create-user.command';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    JobManagerModule,
    PumpAgeModule,
    BatteryLevelModule,
    InsulinLevelModule,
    SensorAgeModule,
    PumpOcclusionModule,
    UsersModule,
  ],
  providers: [RunAllCommand, RunJobCommand, CreateUserCommand],
})
export class CliModule {}

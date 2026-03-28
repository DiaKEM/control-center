import * as path from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { UsersModule } from './users/users.module';
import { NightscoutModule } from './nightscout/nightscout.module';
import { PushoverModule } from './pushover/pushover.module';
import { TelegramModule } from './telegram/telegram.module';
import { JobConfigurationModule } from './job-configuration/job-configuration.module';
import { JobExecutionModule } from './job-execution/job-execution.module';
import { PumpAgeModule } from './jobs/pump-age/pump-age.module';
import { BatteryLevelModule } from './jobs/battery-level/battery-level.module';
import { InsulinLevelModule } from './jobs/insulin-level/insulin-level.module';
import { SensorAgeModule } from './jobs/sensor-age/sensor-age.module';
import { PumpOcclusionModule } from './jobs/pump-occlusion/pump-occlusion.module';
import { NightlyReportModule } from './jobs/nightly-report/nightly-report.module';
import { DayReportModule } from './jobs/day-report/day-report.module';
import { WeeklyReportModule } from './jobs/weekly-report/weekly-report.module';
import { BiweeklyReportModule } from './jobs/biweekly-report/biweekly-report.module';
import { MonthlyReportModule } from './jobs/monthly-report/monthly-report.module';
import { JobTypeModule } from './job-type/job-type.module';
import { JobManagerModule } from './job-manager/job-manager.module';
import { NotificatorModule } from './notificator/notificator.module';
import { NotificationManagerModule } from './notification-manager/notification-manager.module';
import { NotificationCheckerModule } from './notification-checker/notification-checker.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AdminModule } from './admin/admin.module';
import { SetupModule } from './setup/setup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        rootPath: path.resolve(config.get<string>('STATIC_FRONTEND_PATH', '../frontend')),
        exclude: ['/api/*path'],
      }],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    UsersModule,
    NightscoutModule,
    PushoverModule,
    TelegramModule,
    JobConfigurationModule,
    JobExecutionModule,
    PumpAgeModule,
    BatteryLevelModule,
    InsulinLevelModule,
    SensorAgeModule,
    PumpOcclusionModule,
    NightlyReportModule,
    DayReportModule,
    WeeklyReportModule,
    BiweeklyReportModule,
    MonthlyReportModule,
    JobTypeModule,
    JobManagerModule,
    NotificatorModule,
    NotificationManagerModule,
    NotificationCheckerModule,
    SchedulerModule,
    AdminModule,
    SetupModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

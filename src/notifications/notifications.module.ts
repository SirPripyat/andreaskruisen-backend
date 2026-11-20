import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsModule } from '../squads/squads.module';
import { UsersModule } from '../users/users.module';
import { NotificationEventsListener } from './listeners';
import { NotificationsController } from './notifications.controller';
import { NotificationsFacade } from './notifications.facade';
import { NotificationsRepository } from './notifications.repository';
import {
  CreateNotificationUseCase,
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule, SquadsModule, UsersModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsFacade,
    CreateNotificationUseCase,
    ListNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    NotificationEventsListener,
  ],
})
export class NotificationsModule {}

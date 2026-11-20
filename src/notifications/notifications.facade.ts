import { Injectable } from '@nestjs/common';
import { PaginationQuery } from '../commons/pagination';
import {
  ListNotificationsResponseDTO,
  MarkAllNotificationsReadResponseDTO,
  NotificationResponseDTO,
} from './dto';
import {
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from './use-cases';

@Injectable()
export class NotificationsFacade {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
  ) {}

  list(
    seasonId: string,
    userId: string,
    pagination: PaginationQuery,
  ): Promise<ListNotificationsResponseDTO> {
    return this.listNotificationsUseCase.execute(seasonId, userId, pagination);
  }

  markRead(
    id: string,
    seasonId: string,
    userId: string,
  ): Promise<NotificationResponseDTO> {
    return this.markNotificationReadUseCase.execute(id, seasonId, userId);
  }

  markAllRead(
    seasonId: string,
    userId: string,
  ): Promise<MarkAllNotificationsReadResponseDTO> {
    return this.markAllNotificationsReadUseCase.execute(seasonId, userId);
  }
}

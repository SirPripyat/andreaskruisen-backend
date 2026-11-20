import { Injectable } from '@nestjs/common';
import { PaginationQuery } from '../commons/pagination';
import { ListNotificationsResponseDTO, NotificationResponseDTO } from './dto';
import {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
} from './use-cases';

@Injectable()
export class NotificationsFacade {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
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
}

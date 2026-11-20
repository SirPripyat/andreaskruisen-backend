import { Injectable } from '@nestjs/common';
import { PaginationQuery } from '../../commons/pagination';
import { ListNotificationsResponseDTO } from '../dto';
import { NotificationsRepository } from '../notifications.repository';

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  execute(
    seasonId: string,
    userId: string,
    pagination: PaginationQuery,
  ): Promise<ListNotificationsResponseDTO> {
    return this.notificationsRepository.findManyForUser(
      seasonId,
      userId,
      pagination,
    );
  }
}

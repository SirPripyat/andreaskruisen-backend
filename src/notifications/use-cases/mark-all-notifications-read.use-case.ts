import { Injectable } from '@nestjs/common';
import { MarkAllNotificationsReadResponseDTO } from '../dto';
import { NotificationsRepository } from '../notifications.repository';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  execute(
    seasonId: string,
    userId: string,
  ): Promise<MarkAllNotificationsReadResponseDTO> {
    return this.notificationsRepository.markAllReadForUser(seasonId, userId);
  }
}

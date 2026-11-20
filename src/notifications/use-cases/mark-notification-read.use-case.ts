import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationResponseDTO } from '../dto';
import { NotificationsRepository } from '../notifications.repository';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async execute(
    id: string,
    seasonId: string,
    userId: string,
  ): Promise<NotificationResponseDTO> {
    const exists = await this.notificationsRepository.existsForUser(
      id,
      seasonId,
      userId,
    );

    if (!exists) throw new NotFoundException('Notificação não encontrada');

    return this.notificationsRepository.markRead(id);
  }
}

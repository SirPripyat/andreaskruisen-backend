import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '../../../generated/prisma/client';
import { NotificationResponseDTO } from '../dto';
import { NotificationsRepository } from '../notifications.repository';

export type CreateNotificationInput = {
  seasonId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  execute(input: CreateNotificationInput): Promise<NotificationResponseDTO> {
    return this.notificationsRepository.create(input);
  }
}

import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  NotificationType,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
} from '../commons/pagination';
import { NotificationResponseDTO } from './dto';

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  message: true,
  metadata: true,
  readAt: true,
  createdAt: true,
} as const;

@Injectable()
export class NotificationsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  create(data: {
    seasonId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<NotificationResponseDTO> {
    return this.txHost.tx.notification.create({
      data,
      select: NOTIFICATION_SELECT,
    });
  }

  findManyForUser(
    seasonId: string,
    userId: string,
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<NotificationResponseDTO>> {
    const where = { seasonId, userId };

    return paginate(
      () => this.txHost.tx.notification.count({ where }),
      ({ skip, take }) =>
        this.txHost.tx.notification.findMany({
          where,
          skip,
          take,
          select: NOTIFICATION_SELECT,
          orderBy: { createdAt: 'desc' },
        }),
      pagination,
    );
  }

  existsForUser(
    id: string,
    seasonId: string,
    userId: string,
  ): Promise<boolean> {
    return this.txHost.tx.notification
      .count({ where: { id, seasonId, userId } })
      .then((count) => count > 0);
  }

  markRead(id: string): Promise<NotificationResponseDTO> {
    return this.txHost.tx.notification.update({
      where: { id },
      data: { readAt: new Date() },
      select: NOTIFICATION_SELECT,
    });
  }

  markAllReadForUser(
    seasonId: string,
    userId: string,
  ): Promise<{ count: number }> {
    return this.txHost.tx.notification.updateMany({
      where: { seasonId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

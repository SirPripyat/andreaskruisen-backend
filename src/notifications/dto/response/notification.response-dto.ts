import { Notification } from '../../../../generated/prisma/client';
import { PaginatedResult } from '../../../commons/pagination';

export type NotificationResponseDTO = Pick<
  Notification,
  'id' | 'type' | 'title' | 'message' | 'metadata' | 'readAt' | 'createdAt'
>;

export type ListNotificationsResponseDTO =
  PaginatedResult<NotificationResponseDTO>;

export type MarkAllNotificationsReadResponseDTO = {
  count: number;
};

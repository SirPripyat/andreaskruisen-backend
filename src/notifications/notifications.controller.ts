import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { PaginationQuery, PaginationSchema } from '../commons/pagination';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  RequiredSeasonScopedRequest,
  SeasonContextGuard,
} from '../seasons/season-context.guard';
import { ListNotificationsResponseDTO, NotificationResponseDTO } from './dto';
import { NotificationsFacade } from './notifications.facade';

@Controller('notifications')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class NotificationsController {
  constructor(private readonly facade: NotificationsFacade) {}

  @Get()
  list(
    @Req() request: RequiredSeasonScopedRequest,
    @Query(new ZodValidationPipe(PaginationSchema))
    query: PaginationQuery,
  ): Promise<ListNotificationsResponseDTO> {
    return this.facade.list(request.seasonId, request.user.id, query);
  }

  @Patch(':id/read')
  markRead(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('id') id: string,
  ): Promise<NotificationResponseDTO> {
    return this.facade.markRead(id, request.seasonId, request.user.id);
  }
}

import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  RequiredSeasonScopedRequest,
  SeasonContextGuard,
} from '../seasons/season-context.guard';
import {
  GetSimilarPlayersRequestDTO,
  GetSimilarPlayersSchema,
  ListPlayersRequestDTO,
  ListPlayersSchema,
} from './dto';
import { PlayersFacade } from './players.facade';

@Controller('players')
@UseGuards(SessionAuthGuard)
export class PlayersController {
  constructor(private readonly facade: PlayersFacade) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  list(
    @Query(new ZodValidationPipe(ListPlayersSchema))
    query: ListPlayersRequestDTO,
  ) {
    return this.facade.list(query);
  }

  @Get('season')
  @UseGuards(SeasonContextGuard)
  listForSeason(
    @Req() request: RequiredSeasonScopedRequest,
    @Query(new ZodValidationPipe(ListPlayersSchema))
    query: ListPlayersRequestDTO,
  ) {
    return this.facade.listForSeason(request.seasonId, request.user.id, query);
  }

  @Get(':id')
  @UseGuards(SeasonContextGuard)
  getOne(@Req() request: RequiredSeasonScopedRequest, @Param('id') id: string) {
    return this.facade.getOne(request.seasonId, request.user.id, id);
  }

  @Get(':id/similar')
  @UseGuards(SeasonContextGuard)
  getSimilar(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetSimilarPlayersSchema))
    query: GetSimilarPlayersRequestDTO,
  ) {
    return this.facade.getSimilar(request.seasonId, id, query.limit);
  }
}

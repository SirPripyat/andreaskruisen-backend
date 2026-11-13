import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  SeasonContextGuard,
  SeasonScopedRequest,
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
  @UseGuards(AdminGuard)
  list(
    @Query(new ZodValidationPipe(ListPlayersSchema))
    query: ListPlayersRequestDTO,
  ) {
    return this.facade.list(query);
  }

  @Get('season')
  @UseGuards(SeasonContextGuard)
  listForSeason(
    @Req() request: SeasonScopedRequest,
    @Query(new ZodValidationPipe(ListPlayersSchema))
    query: ListPlayersRequestDTO,
  ) {
    return this.facade.listForSeason(request.seasonId, request.user.id, query);
  }

  @Get(':id')
  @UseGuards(SeasonContextGuard)
  getOne(@Req() request: SeasonScopedRequest, @Param('id') id: string) {
    return this.facade.getOne(request.seasonId, request.user.id, id);
  }

  @Get(':id/similar')
  @UseGuards(SeasonContextGuard)
  getSimilar(
    @Req() request: SeasonScopedRequest,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetSimilarPlayersSchema))
    query: GetSimilarPlayersRequestDTO,
  ) {
    return this.facade.getSimilar(request.seasonId, id, query.limit);
  }
}

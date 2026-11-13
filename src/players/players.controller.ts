import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  SeasonContextGuard,
  SeasonScopedRequest,
} from '../seasons/season-context.guard';
import { ListPlayersQuery, ListPlayersSchema } from './dto/list-players.schema';
import {
  SimilarPlayersQuery,
  SimilarPlayersSchema,
} from './dto/similar-players.schema';
import { PlayersService } from './players.service';
import { GetSimilarPlayersUseCase } from './use-cases';

@Controller('players')
@UseGuards(SessionAuthGuard)
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly getSimilarPlayersUseCase: GetSimilarPlayersUseCase,
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  async list(
    @Query(new ZodValidationPipe(ListPlayersSchema)) query: ListPlayersQuery,
  ) {
    return this.playersService.list(query);
  }

  @Get('season')
  @UseGuards(SeasonContextGuard)
  async listForSeason(
    @Req() request: SeasonScopedRequest,
    @Query(new ZodValidationPipe(ListPlayersSchema)) query: ListPlayersQuery,
  ) {
    return this.playersService.listForSeason(request.seasonId, query);
  }

  @Get(':id')
  @UseGuards(SeasonContextGuard)
  async getOne(@Req() request: SeasonScopedRequest, @Param('id') id: string) {
    return this.playersService.getOne(request.seasonId, id);
  }

  @Get(':id/similar')
  @UseGuards(SeasonContextGuard)
  async getSimilar(
    @Req() request: SeasonScopedRequest,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(SimilarPlayersSchema))
    query: SimilarPlayersQuery,
  ) {
    return this.getSimilarPlayersUseCase.execute(
      request.seasonId,
      id,
      query.limit,
    );
  }
}

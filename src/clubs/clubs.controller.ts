import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  RequiredSeasonScopedRequest,
  SeasonContextGuard,
} from '../seasons/season-context.guard';
import { ClubsFacade } from './clubs.facade';
import { ListClubsRequestDTO, ListClubsSchema } from './dto';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly facade: ClubsFacade) {}

  @Get()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  async list(
    @Query(new ZodValidationPipe(ListClubsSchema)) query: ListClubsRequestDTO,
    @Req() request: RequiredSeasonScopedRequest,
  ) {
    return this.facade.list(query, request.seasonId);
  }

  @Get(':id')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  async getOne(
    @Param('id') id: string,
    @Req() request: RequiredSeasonScopedRequest,
  ) {
    return this.facade.getOne(id, request.seasonId);
  }

  @Get(':id/titles')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  async getTitles(
    @Param('id') id: string,
    @Req() request: RequiredSeasonScopedRequest,
  ) {
    return this.facade.getTitles(id, request.seasonId);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  CreateTournament,
  CreateTournamentSchema,
} from './dto/create-tournament.schema';
import {
  GetSituationQuery,
  GetSituationSchema,
} from './dto/get-situation.schema';
import { ListMatchesQuery, ListMatchesSchema } from './dto/list-matches.schema';
import {
  ReplaceMatchGoals,
  ReplaceMatchGoalsSchema,
} from './dto/replace-match-goals.schema';
import {
  UpdateTournament,
  UpdateTournamentSchema,
} from './dto/update-tournament.schema';
import { TournamentsService } from './tournaments.service';

@Controller()
@UseGuards(SessionAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post('seasons/:seasonId/tournaments')
  create(
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(CreateTournamentSchema))
    dto: CreateTournament,
  ) {
    return this.tournamentsService.create(seasonId, dto);
  }

  @Get('seasons/:seasonId/tournaments')
  findBySeason(@Param('seasonId') seasonId: string) {
    return this.tournamentsService.findBySeason(seasonId);
  }

  @Get('tournaments/:id')
  getOne(@Param('id') id: string) {
    return this.tournamentsService.getOne(id);
  }

  @Get('tournaments/:id/situation')
  getSituation(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetSituationSchema))
    query: GetSituationQuery,
  ) {
    return this.tournamentsService.getSituation(id, query);
  }

  @Get('tournaments/:id/matches')
  getMatches(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(ListMatchesSchema)) query: ListMatchesQuery,
  ) {
    return this.tournamentsService.getMatches(id, query);
  }

  @Get('tournaments/:id/matches/:matchId')
  getMatchDetail(@Param('id') id: string, @Param('matchId') matchId: string) {
    return this.tournamentsService.getMatchDetail(id, matchId);
  }

  @Put('tournaments/:id/matches/:matchId/goals')
  @UseGuards(SessionAuthGuard, AdminGuard)
  replaceMatchGoals(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body(new ZodValidationPipe(ReplaceMatchGoalsSchema))
    dto: ReplaceMatchGoals,
  ) {
    return this.tournamentsService.replaceMatchGoals(id, matchId, dto);
  }

  @Post('tournaments/:id/matches/:matchId/simulate')
  @UseGuards(SessionAuthGuard, AdminGuard)
  simulateMatch(@Param('id') id: string, @Param('matchId') matchId: string) {
    return this.tournamentsService.simulateMatch(id, matchId);
  }

  // Gera a próxima fase (mata-mata) a partir desta. Trava a edição das
  // partidas da fase informada (ver TournamentsService.advancePhase).
  @Post('tournaments/:id/phases/:phaseId/advance')
  @UseGuards(SessionAuthGuard, AdminGuard)
  advancePhase(@Param('id') id: string, @Param('phaseId') phaseId: string) {
    return this.tournamentsService.advancePhase(id, phaseId);
  }

  @Get('tournaments/:id/stats')
  getStats(@Param('id') id: string) {
    return this.tournamentsService.getStats(id);
  }

  @Patch('tournaments/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTournamentSchema))
    dto: UpdateTournament,
  ) {
    return this.tournamentsService.update(id, dto);
  }

  @Delete('tournaments/:id')
  remove(@Param('id') id: string) {
    return this.tournamentsService.remove(id);
  }
}

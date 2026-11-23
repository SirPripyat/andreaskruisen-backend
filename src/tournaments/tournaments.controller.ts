import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  CreateTournamentRequestDTO,
  CreateTournamentSchema,
  GetHallOfFameRequestDTO,
  GetHallOfFameSchema,
  GetSituationRequestDTO,
  GetSituationSchema,
  GetTournamentFixturesRequestDTO,
  GetTournamentFixturesSchema,
  UpdateTournamentRequestDTO,
  UpdateTournamentSchema,
} from './dto';
import { TournamentsFacade } from './tournaments.facade';

@Controller('tournaments')
@UseGuards(SessionAuthGuard)
export class TournamentsController {
  constructor(private readonly facade: TournamentsFacade) {}

  @Post()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  create(
    @Req() request: RequiredSeasonScopedRequest,
    @Body(new ZodValidationPipe(CreateTournamentSchema))
    dto: CreateTournamentRequestDTO,
  ) {
    return this.facade.create(request.seasonId, dto);
  }

  @Get()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  findBySeason(@Req() request: RequiredSeasonScopedRequest) {
    return this.facade.findBySeason(request.seasonId);
  }

  // Precisa vir antes de ':id' pro Nest não casar "mine" como se fosse o id.
  @Get('mine')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  findMine(@Req() request: RequiredSeasonScopedRequest) {
    return this.facade.findMine(request.seasonId, request.user.id);
  }

  // Mesmo motivo de 'mine': precisa vir antes de ':id'.
  @Get('hall-of-fame')
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  getHallOfFame(
    @Req() request: RequiredSeasonScopedRequest,
    @Query(new ZodValidationPipe(GetHallOfFameSchema))
    query: GetHallOfFameRequestDTO,
  ) {
    return this.facade.getHallOfFame(request.seasonId, query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.facade.getOne(id);
  }

  @Get(':id/situation')
  getSituation(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetSituationSchema))
    query: GetSituationRequestDTO,
  ) {
    return this.facade.getSituation(id, query);
  }

  @Get(':id/fixtures')
  getFixtures(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetTournamentFixturesSchema))
    query: GetTournamentFixturesRequestDTO,
  ) {
    return this.facade.getFixtures(id, query);
  }

  @Post(':id/phases/:phaseId/advance')
  @Roles(UserRole.ADMIN)
  @UseGuards(SessionAuthGuard, RolesGuard)
  advancePhase(@Param('id') id: string, @Param('phaseId') phaseId: string) {
    return this.facade.advancePhase(id, phaseId);
  }

  @Post(':id/finish')
  @Roles(UserRole.ADMIN)
  @UseGuards(SessionAuthGuard, RolesGuard)
  finish(@Param('id') id: string) {
    return this.facade.finish(id);
  }

  @Get(':id/top-scorers')
  getTopScorers(@Param('id') id: string) {
    return this.facade.getTopScorers(id);
  }

  @Get(':id/top-assists')
  getTopAssists(@Param('id') id: string) {
    return this.facade.getTopAssists(id);
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string) {
    return this.facade.getDashboard(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTournamentSchema))
    dto: UpdateTournamentRequestDTO,
  ) {
    return this.facade.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.facade.remove(id);
  }
}

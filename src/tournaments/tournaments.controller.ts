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
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  SeasonContextGuard,
  SeasonScopedRequest,
} from '../seasons/season-context.guard';
import {
  CreateTournament,
  CreateTournamentSchema,
  GetSituationQuery,
  GetSituationSchema,
  UpdateTournament,
  UpdateTournamentSchema,
} from './dto';
import {
  AdvancePhaseUseCase,
  CreateTournamentUseCase,
  GetTopAssistsUseCase,
  GetTopScorersUseCase,
  GetTournamentDashboardUseCase,
  GetTournamentFixturesUseCase,
  GetTournamentSituationUseCase,
  GetTournamentUseCase,
  ListTournamentsUseCase,
  RemoveTournamentUseCase,
  UpdateTournamentUseCase,
} from './use-cases';

@Controller('tournaments')
@UseGuards(SessionAuthGuard)
export class TournamentsController {
  constructor(
    private readonly createTournamentUseCase: CreateTournamentUseCase,
    private readonly listTournamentsUseCase: ListTournamentsUseCase,
    private readonly getTournamentUseCase: GetTournamentUseCase,
    private readonly getTournamentSituationUseCase: GetTournamentSituationUseCase,
    private readonly getTournamentFixturesUseCase: GetTournamentFixturesUseCase,
    private readonly advancePhaseUseCase: AdvancePhaseUseCase,
    private readonly getTopScorersUseCase: GetTopScorersUseCase,
    private readonly getTopAssistsUseCase: GetTopAssistsUseCase,
    private readonly getTournamentDashboardUseCase: GetTournamentDashboardUseCase,
    private readonly updateTournamentUseCase: UpdateTournamentUseCase,
    private readonly removeTournamentUseCase: RemoveTournamentUseCase,
  ) {}

  @Post()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  create(
    @Req() request: SeasonScopedRequest,
    @Body(new ZodValidationPipe(CreateTournamentSchema))
    dto: CreateTournament,
  ) {
    return this.createTournamentUseCase.execute(request.seasonId, dto);
  }

  @Get()
  @UseGuards(SessionAuthGuard, SeasonContextGuard)
  findBySeason(@Req() request: SeasonScopedRequest) {
    return this.listTournamentsUseCase.execute(request.seasonId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.getTournamentUseCase.execute(id);
  }

  @Get(':id/situation')
  getSituation(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetSituationSchema))
    query: GetSituationQuery,
  ) {
    return this.getTournamentSituationUseCase.execute(id, query);
  }

  @Get(':id/fixtures')
  getFixtures(@Param('id') id: string) {
    return this.getTournamentFixturesUseCase.execute(id);
  }

  @Post(':id/phases/:phaseId/advance')
  @UseGuards(SessionAuthGuard, AdminGuard)
  advancePhase(@Param('id') id: string, @Param('phaseId') phaseId: string) {
    return this.advancePhaseUseCase.execute(id, phaseId);
  }

  @Get(':id/top-scorers')
  getTopScorers(@Param('id') id: string) {
    return this.getTopScorersUseCase.execute(id);
  }

  @Get(':id/top-assists')
  getTopAssists(@Param('id') id: string) {
    return this.getTopAssistsUseCase.execute(id);
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string) {
    return this.getTournamentDashboardUseCase.execute(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTournamentSchema))
    dto: UpdateTournament,
  ) {
    return this.updateTournamentUseCase.execute(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.removeTournamentUseCase.execute(id);
  }
}

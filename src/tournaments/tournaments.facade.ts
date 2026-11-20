import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClsService } from 'nestjs-cls';
import {
  flushPendingTournamentPrizeEvents,
  TOURNAMENT_PRIZE_AWARDED_EVENT,
} from '../notifications/events';
import {
  CreateTournamentRequestDTO,
  CreateTournamentResponseDTO,
  GetSituationRequestDTO,
  GetTopAssistsResponseDTO,
  GetTopScorersResponseDTO,
  GetTournamentDashboardResponseDTO,
  GetTournamentFixturesResponseDTO,
  GetTournamentResponseDTO,
  GetTournamentSituationResponseDTO,
  ListMyTournamentsResponseDTO,
  ListTournamentsResponseDTO,
  UpdateTournamentRequestDTO,
  UpdateTournamentResponseDTO,
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
  ListMyTournamentsUseCase,
  ListTournamentsUseCase,
  RemoveTournamentUseCase,
  UpdateTournamentUseCase,
} from './use-cases';

@Injectable()
export class TournamentsFacade {
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
    private readonly listMyTournamentsUseCase: ListMyTournamentsUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly cls: ClsService,
  ) {}

  create(
    seasonId: string,
    dto: CreateTournamentRequestDTO,
  ): Promise<CreateTournamentResponseDTO> {
    return this.createTournamentUseCase.execute(seasonId, dto);
  }

  findBySeason(seasonId: string): Promise<ListTournamentsResponseDTO> {
    return this.listTournamentsUseCase.execute(seasonId);
  }

  findMine(
    seasonId: string,
    userId: string,
  ): Promise<ListMyTournamentsResponseDTO> {
    return this.listMyTournamentsUseCase.execute(seasonId, userId);
  }

  getOne(id: string): Promise<GetTournamentResponseDTO> {
    return this.getTournamentUseCase.execute(id);
  }

  getSituation(
    id: string,
    query: GetSituationRequestDTO,
  ): Promise<GetTournamentSituationResponseDTO> {
    return this.getTournamentSituationUseCase.execute(id, query);
  }

  getFixtures(id: string): Promise<GetTournamentFixturesResponseDTO> {
    return this.getTournamentFixturesUseCase.execute(id);
  }

  async advancePhase(id: string, phaseId: string): Promise<void> {
    await this.advancePhaseUseCase.execute(id, phaseId);

    for (const event of flushPendingTournamentPrizeEvents(this.cls))
      this.eventEmitter.emit(TOURNAMENT_PRIZE_AWARDED_EVENT, event);
  }

  getTopScorers(id: string): Promise<GetTopScorersResponseDTO> {
    return this.getTopScorersUseCase.execute(id);
  }

  getTopAssists(id: string): Promise<GetTopAssistsResponseDTO> {
    return this.getTopAssistsUseCase.execute(id);
  }

  getDashboard(id: string): Promise<GetTournamentDashboardResponseDTO> {
    return this.getTournamentDashboardUseCase.execute(id);
  }

  update(
    id: string,
    dto: UpdateTournamentRequestDTO,
  ): Promise<UpdateTournamentResponseDTO> {
    return this.updateTournamentUseCase.execute(id, dto);
  }

  remove(id: string): Promise<void> {
    return this.removeTournamentUseCase.execute(id);
  }
}

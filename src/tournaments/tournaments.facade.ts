import { Injectable } from '@nestjs/common';
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

  advancePhase(id: string, phaseId: string): Promise<void> {
    return this.advancePhaseUseCase.execute(id, phaseId);
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

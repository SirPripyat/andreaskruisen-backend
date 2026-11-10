import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { TournamentSummary } from '../types';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

@Injectable()
export class GetTournamentUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
  ) {}

  async execute(tournamentId: string): Promise<TournamentSummary> {
    const tournament =
      await this.findTournamentOrThrowUseCase.execute(tournamentId);

    const currentPhase =
      await this.tournamentsRepository.findLatestPhase(tournamentId);

    return {
      id: tournament.id,
      seasonId: tournament.seasonId,
      name: tournament.name,
      format: tournament.format,
      maxTeams: tournament.maxTeams,
      createdAt: tournament.createdAt,
      currentPhase,
    };
  }
}

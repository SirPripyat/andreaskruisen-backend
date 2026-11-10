import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { TournamentsRepository } from '../tournaments.repository';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

@Injectable()
export class RemoveTournamentUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
  ) {}

  @Transactional()
  async execute(tournamentId: string): Promise<void> {
    await this.findTournamentOrThrowUseCase.execute(tournamentId);

    await this.tournamentsRepository.removeAllMatches(tournamentId);
    await this.tournamentsRepository.removeAllPhases(tournamentId);
    await this.tournamentsRepository.removeAllTeams(tournamentId);
    await this.tournamentsRepository.delete(tournamentId);
  }
}

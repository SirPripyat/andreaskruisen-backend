import { ConflictException, Injectable } from '@nestjs/common';
import { Tournament } from '../../../generated/prisma/client';
import { TournamentsRepository } from '../tournaments.repository';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';
import { IsTournamentFinishedUseCase } from './is-tournament-finished.use-case';

@Injectable()
export class FinishTournamentUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
    private readonly isTournamentFinishedUseCase: IsTournamentFinishedUseCase,
  ) {}

  async execute(tournamentId: string): Promise<Tournament> {
    const tournament =
      await this.findTournamentOrThrowUseCase.execute(tournamentId);

    if (tournament.finishedAt)
      throw new ConflictException('Torneio já foi encerrado');

    const isFinished =
      await this.isTournamentFinishedUseCase.execute(tournament);

    if (!isFinished)
      throw new ConflictException(
        'Torneio ainda não terminou: a fase decisiva precisa ter todas as partidas jogadas',
      );

    return this.tournamentsRepository.finish(tournamentId);
  }
}

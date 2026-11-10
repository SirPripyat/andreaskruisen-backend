import { Injectable } from '@nestjs/common';
import { Tournament } from '../../../generated/prisma/client';
import { UpdateTournament } from '../dto';
import { TournamentsRepository } from '../tournaments.repository';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

@Injectable()
export class UpdateTournamentUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
  ) {}

  async execute(
    tournamentId: string,
    dto: UpdateTournament,
  ): Promise<Tournament> {
    await this.findTournamentOrThrowUseCase.execute(tournamentId);

    return this.tournamentsRepository.update(tournamentId, {
      name: dto.name,
    });
  }
}

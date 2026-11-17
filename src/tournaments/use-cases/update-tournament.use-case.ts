import { Injectable } from '@nestjs/common';
import { Tournament } from '../../../generated/prisma/client';
import { UpdateTournamentRequestDTO } from '../dto/request';
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
    dto: UpdateTournamentRequestDTO,
  ): Promise<Tournament> {
    await this.findTournamentOrThrowUseCase.execute(tournamentId);

    return this.tournamentsRepository.update(tournamentId, {
      name: dto.name,
    });
  }
}

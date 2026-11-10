import { Injectable, NotFoundException } from '@nestjs/common';
import { Tournament } from '../../../generated/prisma/client';
import { TournamentsRepository } from '../tournaments.repository';

@Injectable()
export class FindTournamentOrThrowUseCase {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  async execute(tournamentId: string): Promise<Tournament> {
    const tournament = await this.tournamentsRepository.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Torneio não encontrado');
    }
    return tournament;
  }
}

import { Injectable } from '@nestjs/common';
import { Tournament } from '../../../generated/prisma/client';
import { TournamentsRepository } from '../tournaments.repository';

// Deriva se ESSE torneio já chegou no fim (última fase possível totalmente
// jogada) sem depender de nenhum campo persistido — usado pelo
// HasActiveTournamentUseCase (um torneio por vez, dentro do loop da
// temporada) e pelo FinishTournamentUseCase, que exige essa condição antes
// de aceitar o encerramento explícito.
@Injectable()
export class IsTournamentFinishedUseCase {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  async execute(
    tournament: Pick<Tournament, 'id' | 'format'>,
  ): Promise<boolean> {
    const latestPhase = await this.tournamentsRepository.findLatestPhase(
      tournament.id,
    );
    if (!latestPhase) return false;

    const unplayedCount = await this.tournamentsRepository.countUnplayedMatches(
      latestPhase.id,
    );
    if (unplayedCount > 0) return false;

    if (tournament.format === 'LEAGUE') return true;

    if (latestPhase.type === 'GROUP') return false;

    const matchCount = await this.tournamentsRepository.countMatches(
      latestPhase.id,
    );
    return matchCount === 1;
  }
}

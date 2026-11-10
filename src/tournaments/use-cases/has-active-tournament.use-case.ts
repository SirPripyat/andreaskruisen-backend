import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';

// Usado pra travar transferências (ver CreateTransferUseCase): um torneio
// está "ativo" até sua última fase possível terminar. Espelha a mesma
// condição de parada de AdvancePhaseUseCase, sem tocar nos dados (nenhuma
// fase nova é gerada aqui).
@Injectable()
export class HasActiveTournamentUseCase {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  async execute(seasonId: string): Promise<boolean> {
    const tournaments = await this.tournamentsRepository.findBySeason(seasonId);

    for (const tournament of tournaments) {
      const latestPhase = await this.tournamentsRepository.findLatestPhase(
        tournament.id,
      );
      if (!latestPhase) {
        return true;
      }

      const unplayedCount =
        await this.tournamentsRepository.countUnplayedMatches(latestPhase.id);
      if (unplayedCount > 0) {
        return true;
      }

      if (tournament.format === 'LEAGUE') {
        continue;
      }

      if (latestPhase.type === 'GROUP') {
        return true;
      }

      const matchCount = await this.tournamentsRepository.countMatches(
        latestPhase.id,
      );
      if (matchCount > 1) {
        return true;
      }
    }

    return false;
  }
}

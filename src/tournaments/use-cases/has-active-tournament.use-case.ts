import { Injectable } from '@nestjs/common';
import { TournamentsRepository } from '../tournaments.repository';
import { IsTournamentFinishedUseCase } from './is-tournament-finished.use-case';

// Usado pra travar transferências (ver CreateTransferUseCase): um torneio
// está "ativo" até sua última fase possível terminar. Espelha a mesma
// condição de parada de AdvancePhaseUseCase, sem tocar nos dados (nenhuma
// fase nova é gerada aqui).
@Injectable()
export class HasActiveTournamentUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly isTournamentFinishedUseCase: IsTournamentFinishedUseCase,
  ) {}

  async execute(seasonId: string): Promise<boolean> {
    const tournaments = await this.tournamentsRepository.findBySeason(seasonId);

    for (const tournament of tournaments) {
      const finished =
        await this.isTournamentFinishedUseCase.execute(tournament);
      if (!finished) return true;
    }

    return false;
  }
}

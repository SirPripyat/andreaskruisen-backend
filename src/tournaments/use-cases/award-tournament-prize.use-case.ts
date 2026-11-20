import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { queuePendingTournamentPrizeEvent } from '../../notifications/events';
import { TournamentsRepository } from '../tournaments.repository';
import { TournamentPrizeType } from '../types';
import { resolvePrizeDelta } from '../utils';

export type AwardTournamentPrizeInput = {
  seasonId: string;
  squadId: string;
  type: TournamentPrizeType;
  targetAmount: number;
  matchId?: string;
  phaseId?: string;
};

// Ponto único de escrita pros prêmios automáticos de torneio (resultado de
// partida, posição na fase de grupos/liga, avanço de fase, campeão/vice —
// ver docs do plano em tournament-prizes.utils.ts). Reconcilia contra o que
// já foi lançado pra esse squad+type+partida/fase, pra ser seguro chamar de
// novo depois que um placar é corrigido (não lança nada se o valor não
// mudou; lança só a diferença se mudou).
@Injectable()
export class AwardTournamentPrizeUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly cls: ClsService,
  ) {}

  async execute(input: AwardTournamentPrizeInput): Promise<void> {
    const recordedTotal =
      await this.tournamentsRepository.getRecordedPrizeTotal({
        squadId: input.squadId,
        type: input.type,
        matchId: input.matchId,
        phaseId: input.phaseId,
      });

    const delta = resolvePrizeDelta(recordedTotal, input.targetAmount);
    if (delta === 0) return;

    await this.tournamentsRepository.createPrizeTransaction({
      squadId: input.squadId,
      type: input.type,
      amount: delta,
      matchId: input.matchId,
      phaseId: input.phaseId,
    });

    queuePendingTournamentPrizeEvent(this.cls, {
      seasonId: input.seasonId,
      squadId: input.squadId,
      type: input.type,
      amount: delta,
      matchId: input.matchId,
      phaseId: input.phaseId,
    });
  }
}

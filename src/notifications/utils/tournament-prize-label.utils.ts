import { TournamentPrizeType } from '../../tournaments/types';

const TOURNAMENT_PRIZE_LABELS: Record<TournamentPrizeType, string> = {
  WIN: 'vitória',
  DRAW: 'empate',
  LOSS: 'derrota',
  RANKING: 'posição na fase de grupos',
  PRIZE_PHASE: 'avanço de fase',
  CHAMPION: 'campeão',
  RUNNER_UP: 'vice-campeão',
};

export const tournamentPrizeLabel = (type: TournamentPrizeType): string =>
  TOURNAMENT_PRIZE_LABELS[type];

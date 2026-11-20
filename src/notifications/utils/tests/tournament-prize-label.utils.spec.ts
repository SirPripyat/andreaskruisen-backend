import { tournamentPrizeLabel } from '../tournament-prize-label.utils';

describe('tournamentPrizeLabel', () => {
  it('traduz cada tipo de prêmio pro texto exibido na notificação', () => {
    expect(tournamentPrizeLabel('WIN')).toBe('vitória');
    expect(tournamentPrizeLabel('DRAW')).toBe('empate');
    expect(tournamentPrizeLabel('LOSS')).toBe('derrota');
    expect(tournamentPrizeLabel('RANKING')).toBe('posição na fase de grupos');
    expect(tournamentPrizeLabel('PRIZE_PHASE')).toBe('avanço de fase');
    expect(tournamentPrizeLabel('CHAMPION')).toBe('campeão');
    expect(tournamentPrizeLabel('RUNNER_UP')).toBe('vice-campeão');
  });
});

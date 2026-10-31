import { determineChampionTeamId } from './tournament-champion';

describe('determineChampionTeamId', () => {
  it('retorna null se a fase atual ainda não terminou', () => {
    expect(
      determineChampionTeamId({
        format: 'KNOCKOUT',
        isLatestPhaseFullyPlayed: false,
        latestPhaseType: 'KNOCKOUT',
        knockoutMatches: [
          { homeTeamId: 't1', awayTeamId: 't2', goalScorerTeamIds: [] },
        ],
      }),
    ).toBeNull();
  });

  describe('KNOCKOUT (ou reta final de GROUP_STAGE_KNOCKOUT)', () => {
    it('devolve o vencedor quando a fase já é a final (1 partida)', () => {
      const championId = determineChampionTeamId({
        format: 'KNOCKOUT',
        isLatestPhaseFullyPlayed: true,
        latestPhaseType: 'KNOCKOUT',
        knockoutMatches: [
          {
            homeTeamId: 't1',
            awayTeamId: 't2',
            goalScorerTeamIds: ['t1', 't1', 't2'],
          },
        ],
      });
      expect(championId).toBe('t1');
    });

    it('retorna null se a fase ainda tem mais de uma partida (não é a final)', () => {
      const championId = determineChampionTeamId({
        format: 'KNOCKOUT',
        isLatestPhaseFullyPlayed: true,
        latestPhaseType: 'KNOCKOUT',
        knockoutMatches: [
          { homeTeamId: 't1', awayTeamId: 't2', goalScorerTeamIds: ['t1'] },
          { homeTeamId: 't3', awayTeamId: 't4', goalScorerTeamIds: ['t3'] },
        ],
      });
      expect(championId).toBeNull();
    });

    it('retorna null se a final empatou', () => {
      const championId = determineChampionTeamId({
        format: 'KNOCKOUT',
        isLatestPhaseFullyPlayed: true,
        latestPhaseType: 'KNOCKOUT',
        knockoutMatches: [
          {
            homeTeamId: 't1',
            awayTeamId: 't2',
            goalScorerTeamIds: ['t1', 't2'],
          },
        ],
      });
      expect(championId).toBeNull();
    });
  });

  describe('GROUP', () => {
    it('devolve o líder da tabela quando o formato é LEAGUE', () => {
      const championId = determineChampionTeamId({
        format: 'LEAGUE',
        isLatestPhaseFullyPlayed: true,
        latestPhaseType: 'GROUP',
        standingsByGroup: { A: [{ teamId: 't1' }, { teamId: 't2' }] },
      });
      expect(championId).toBe('t1');
    });

    it('retorna null se uma LEAGUE viesse com mais de um grupo (não deveria acontecer, ver generateLeagueMatches)', () => {
      const championId = determineChampionTeamId({
        format: 'LEAGUE',
        isLatestPhaseFullyPlayed: true,
        latestPhaseType: 'GROUP',
        standingsByGroup: {
          A: [{ teamId: 't1' }],
          B: [{ teamId: 't2' }],
        },
      });
      expect(championId).toBeNull();
    });

    it('retorna null quando GROUP_STAGE_KNOCKOUT ainda está na fase de grupos', () => {
      const championId = determineChampionTeamId({
        format: 'GROUP_STAGE_KNOCKOUT',
        isLatestPhaseFullyPlayed: true,
        latestPhaseType: 'GROUP',
        standingsByGroup: { A: [{ teamId: 't1' }] },
      });
      expect(championId).toBeNull();
    });
  });
});

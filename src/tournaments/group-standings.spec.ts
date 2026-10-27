import { computeGroupStandings, GroupStandingMatch } from './group-standings';

const teams = [
  { id: 't1', name: 'Ajax' },
  { id: 't2', name: 'Barcelona' },
  { id: 't3', name: 'Chelsea' },
  { id: 't4', name: 'Dortmund' },
];

describe('computeGroupStandings', () => {
  it('sem resultados, zera tudo e ordena por nome (desempate final)', () => {
    const standings = computeGroupStandings(
      [teams[3], teams[0]], // Dortmund, Ajax (fora de ordem alfabética)
      [],
    );

    expect(standings).toEqual([
      expect.objectContaining({ teamName: 'Ajax', position: 1, played: 0 }),
      expect.objectContaining({
        teamName: 'Dortmund',
        position: 2,
        played: 0,
      }),
    ]);
    expect(standings[0].last5).toEqual([]);
    expect(standings[0].winPercentage).toBe(0);
  });

  it('calcula pontos, saldo de gol e % de aproveitamento com resultados reais', () => {
    const matches: GroupStandingMatch[] = [
      {
        homeTeamId: 't1',
        awayTeamId: 't2',
        result: { homeGoals: 2, awayGoals: 1 },
      },
      {
        homeTeamId: 't1',
        awayTeamId: 't3',
        result: { homeGoals: 1, awayGoals: 1 },
      },
      {
        homeTeamId: 't1',
        awayTeamId: 't4',
        result: { homeGoals: 3, awayGoals: 0 },
      },
      {
        homeTeamId: 't2',
        awayTeamId: 't3',
        result: { homeGoals: 0, awayGoals: 2 },
      },
      {
        homeTeamId: 't2',
        awayTeamId: 't4',
        result: { homeGoals: 1, awayGoals: 1 },
      },
      {
        homeTeamId: 't3',
        awayTeamId: 't4',
        result: { homeGoals: 2, awayGoals: 2 },
      },
    ];

    const standings = computeGroupStandings(teams, matches);

    expect(standings.map((s) => s.teamId)).toEqual(['t1', 't3', 't4', 't2']);

    const ajax = standings[0];
    expect(ajax).toMatchObject({
      teamId: 't1',
      played: 3,
      wins: 2,
      draws: 1,
      losses: 0,
      goalsFor: 6,
      goalsAgainst: 2,
      goalDifference: 4,
      points: 7,
      winPercentage: 77.8,
    });
  });

  it('desempata por saldo de gol quando os pontos empatam', () => {
    const matches: GroupStandingMatch[] = [
      // t1 e t2 terminam com os mesmos pontos (3), t1 com saldo melhor.
      {
        homeTeamId: 't1',
        awayTeamId: 't3',
        result: { homeGoals: 3, awayGoals: 0 },
      },
      {
        homeTeamId: 't2',
        awayTeamId: 't4',
        result: { homeGoals: 1, awayGoals: 0 },
      },
    ];

    const standings = computeGroupStandings(teams, matches);
    const [first, second] = standings;

    expect(first.teamId).toBe('t1');
    expect(second.teamId).toBe('t2');
  });

  it('guarda os últimos 5 jogos, mais recente primeiro', () => {
    const matches: GroupStandingMatch[] = [
      {
        homeTeamId: 't1',
        awayTeamId: 't2',
        result: { homeGoals: 1, awayGoals: 0 },
      }, // W
      {
        homeTeamId: 't1',
        awayTeamId: 't3',
        result: { homeGoals: 0, awayGoals: 1 },
      }, // L
      {
        homeTeamId: 't1',
        awayTeamId: 't4',
        result: { homeGoals: 1, awayGoals: 1 },
      }, // D
    ];

    const standings = computeGroupStandings(teams, matches);

    expect(standings[0]).toMatchObject({
      teamId: 't1',
      last5: ['D', 'L', 'W'],
    });
  });
});

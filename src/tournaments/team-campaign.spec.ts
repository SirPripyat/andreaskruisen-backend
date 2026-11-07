import {
  computeHeadToHead,
  computeSeasonCampaign,
  matchOutcome,
  TeamMatchResult,
  toRecentMatches,
} from './team-campaign';

function team(id: string, name = id): { id: string; name: string; crestUrl: string } {
  return { id, name, crestUrl: `${id}.png` };
}

function match(data: Partial<TeamMatchResult> & { opponentId: string }): TeamMatchResult {
  return {
    matchId: data.matchId ?? `match-${data.opponentId}-${Math.random()}`,
    playedAt: data.playedAt ?? new Date('2026-01-01'),
    seasonId: data.seasonId ?? 'season-1',
    opponent: data.opponent ?? team(data.opponentId),
    goalsFor: data.goalsFor ?? 0,
    goalsAgainst: data.goalsAgainst ?? 0,
  };
}

describe('matchOutcome', () => {
  it('retorna V quando marca mais que o adversário', () => {
    expect(matchOutcome(2, 1)).toBe('V');
  });

  it('retorna D quando marca menos que o adversário', () => {
    expect(matchOutcome(1, 2)).toBe('D');
  });

  it('retorna E quando os gols são iguais', () => {
    expect(matchOutcome(1, 1)).toBe('E');
  });
});

describe('computeSeasonCampaign', () => {
  it('soma jogos, pontos e gols só da temporada informada', () => {
    const matches = [
      match({ opponentId: 'a', seasonId: 'season-1', goalsFor: 2, goalsAgainst: 1 }), // V
      match({ opponentId: 'b', seasonId: 'season-1', goalsFor: 1, goalsAgainst: 1 }), // E
      match({ opponentId: 'c', seasonId: 'season-1', goalsFor: 0, goalsAgainst: 2 }), // D
      match({ opponentId: 'a', seasonId: 'season-2', goalsFor: 5, goalsAgainst: 0 }), // outra temporada
    ];

    const campaign = computeSeasonCampaign(matches, 'season-1');

    expect(campaign).toEqual({
      games: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      goalsFor: 3,
      goalsAgainst: 4,
      points: 4,
      pointsPercentage: (4 / 9) * 100,
    });
  });

  it('devolve zeros sem jogo nenhum na temporada', () => {
    const campaign = computeSeasonCampaign([], 'season-1');
    expect(campaign).toEqual({
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      pointsPercentage: 0,
    });
  });
});

describe('toRecentMatches', () => {
  it('corta pros N primeiros (já vêm do mais recente pro mais antigo) e resolve o resultado', () => {
    const matches = [
      match({ opponentId: 'a', goalsFor: 3, goalsAgainst: 1 }),
      match({ opponentId: 'b', goalsFor: 0, goalsAgainst: 0 }),
      match({ opponentId: 'c', goalsFor: 1, goalsAgainst: 2 }),
    ];

    const recent = toRecentMatches(matches, 2);

    expect(recent).toHaveLength(2);
    expect(recent[0]).toMatchObject({ opponent: team('a'), result: 'V' });
    expect(recent[1]).toMatchObject({ opponent: team('b'), result: 'E' });
  });
});

describe('computeHeadToHead', () => {
  it('acha o maior freguês (mais vitórias) e o maior carrasco (mais derrotas)', () => {
    const matches = [
      match({ opponentId: 'victim', goalsFor: 2, goalsAgainst: 0 }),
      match({ opponentId: 'victim', goalsFor: 1, goalsAgainst: 0 }),
      match({ opponentId: 'victim', goalsFor: 3, goalsAgainst: 1 }),
      match({ opponentId: 'tormentor', goalsFor: 0, goalsAgainst: 1 }),
      match({ opponentId: 'tormentor', goalsFor: 1, goalsAgainst: 2 }),
      match({ opponentId: 'neutral', goalsFor: 1, goalsAgainst: 1 }),
    ];

    const { biggestVictim, biggestTormentor } = computeHeadToHead(matches);

    expect(biggestVictim).toMatchObject({ opponent: team('victim'), wins: 3 });
    expect(biggestTormentor).toMatchObject({
      opponent: team('tormentor'),
      losses: 2,
    });
  });

  it('devolve null quando não há nenhuma vitória ou nenhuma derrota', () => {
    const matches = [match({ opponentId: 'a', goalsFor: 1, goalsAgainst: 1 })];

    const { biggestVictim, biggestTormentor } = computeHeadToHead(matches);

    expect(biggestVictim).toBeNull();
    expect(biggestTormentor).toBeNull();
  });
});

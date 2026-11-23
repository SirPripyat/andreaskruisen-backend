import { GoalLeader, GoalLeaderRow } from '../../types';
import {
  buildPositionByPlayerId,
  countMatchesPerTeam,
  countTitlesPerTeam,
  toHallOfFameLeaders,
} from '../hall-of-fame.utils';

describe('countMatchesPerTeam', () => {
  it('soma 1 partida pro time da casa e 1 pro visitante', () => {
    const result = countMatchesPerTeam([
      { homeTeamId: 'team-1', awayTeamId: 'team-2' },
      { homeTeamId: 'team-2', awayTeamId: 'team-1' },
      { homeTeamId: 'team-1', awayTeamId: 'team-3' },
    ]);

    expect(result.get('team-1')).toBe(3);
    expect(result.get('team-2')).toBe(2);
    expect(result.get('team-3')).toBe(1);
  });
});

describe('countTitlesPerTeam', () => {
  it('conta um título por torneio cujo campeão é o time', () => {
    const result = countTitlesPerTeam(['team-1', 'team-1', 'team-2']);

    expect(result.get('team-1')).toBe(2);
    expect(result.get('team-2')).toBe(1);
  });

  it('ignora torneios sem campeão único', () => {
    const result = countTitlesPerTeam(['team-1', null]);

    expect(result.get('team-1')).toBe(1);
    expect(result.size).toBe(1);
  });
});

describe('buildPositionByPlayerId', () => {
  it('numera a posição (1-based) de cada jogador na ordem recebida', () => {
    const rows: GoalLeaderRow[] = [
      { playerId: 'player-1', teamId: 'team-1', count: 10 },
      { playerId: 'player-2', teamId: 'team-2', count: 7 },
    ];

    const result = buildPositionByPlayerId(rows);

    expect(result.get('player-1')).toBe(1);
    expect(result.get('player-2')).toBe(2);
  });
});

describe('toHallOfFameLeaders', () => {
  const leader: GoalLeader = {
    player: {
      id: 'player-1',
      name: 'Dembélé',
      photoUrl: 'photo-1',
      position: 'ATA',
    },
    team: { id: 'team-1', name: 'Ajax', crestUrl: 'crest-1' },
    count: 9,
  };

  it('calcula a média de gols/assistências por partida e os títulos do time do líder', () => {
    const matchesPerTeam = new Map([['team-1', 6]]);
    const titlesPerTeam = new Map([['team-1', 2]]);

    const [result] = toHallOfFameLeaders(
      [leader],
      matchesPerTeam,
      titlesPerTeam,
      new Map(),
    );

    expect(result).toEqual({
      ...leader,
      matchesPlayed: 6,
      average: 1.5,
      titles: 2,
      positionChange: null,
    });
  });

  it('arredonda a média em duas casas decimais', () => {
    const matchesPerTeam = new Map([['team-1', 7]]);

    const [result] = toHallOfFameLeaders(
      [leader],
      matchesPerTeam,
      new Map(),
      new Map(),
    );

    expect(result.average).toBe(1.29);
  });

  it('retorna média e títulos 0 quando o time não tem partida/título registrado', () => {
    const [result] = toHallOfFameLeaders(
      [leader],
      new Map(),
      new Map(),
      new Map(),
    );

    expect(result).toEqual({
      ...leader,
      matchesPlayed: 0,
      average: 0,
      titles: 0,
      positionChange: null,
    });
  });

  it('calcula positionChange positivo quando o jogador subiu no ranking', () => {
    // estava em 3º (index 2) antes, está em 1º (index 0) agora: subiu 2.
    const previousPositionByPlayerId = new Map([['player-1', 3]]);

    const [result] = toHallOfFameLeaders(
      [leader],
      new Map(),
      new Map(),
      previousPositionByPlayerId,
    );

    expect(result.positionChange).toBe(2);
  });

  it('calcula positionChange negativo quando o jogador desceu no ranking', () => {
    // estava em 1º antes, está em 2º agora (index 1): desceu 1.
    const other: GoalLeader = {
      ...leader,
      player: { ...leader.player, id: 'player-2' },
    };
    const previousPositionByPlayerId = new Map([['player-2', 1]]);

    const [, result] = toHallOfFameLeaders(
      [leader, other],
      new Map(),
      new Map(),
      previousPositionByPlayerId,
    );

    expect(result.positionChange).toBe(-1);
  });
});

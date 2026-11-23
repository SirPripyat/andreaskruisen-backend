import { GoalLeader, GoalLeaderRow, HallOfFameLeader } from '../types';

// Conta quantas partidas cada time disputou a partir da lista crua de
// confrontos (ver TournamentsRepository.findPlayedMatchTeamsByFormat) —
// cada partida soma 1 pro time da casa e 1 pro visitante.
export const countMatchesPerTeam = (
  matches: { homeTeamId: string; awayTeamId: string }[],
): Map<string, number> => {
  const matchesPerTeam = new Map<string, number>();

  for (const match of matches) {
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      matchesPerTeam.set(teamId, (matchesPerTeam.get(teamId) ?? 0) + 1);
    }
  }

  return matchesPerTeam;
};

// Conta quantos títulos cada time tem a partir da lista crua de campeões
// (um por torneio encerrado do formato, ver GetChampionTeamIdUseCase) — null
// quando o torneio não teve como ter um campeão único, não soma pra ninguém.
export const countTitlesPerTeam = (
  championTeamIds: (string | null)[],
): Map<string, number> => {
  const titlesPerTeam = new Map<string, number>();

  for (const teamId of championTeamIds) {
    if (!teamId) continue;
    titlesPerTeam.set(teamId, (titlesPerTeam.get(teamId) ?? 0) + 1);
  }

  return titlesPerTeam;
};

// Posição (1-based) de cada jogador numa lista de líderes já ordenada por
// contagem desc (ver TournamentsRepository.findTopScorersByFormat/
// findTopAssistsByFormat) — usado pra comparar com o ranking atual e saber
// quem subiu ou desceu (ver toHallOfFameLeaders).
export const buildPositionByPlayerId = (
  rows: GoalLeaderRow[],
): Map<string, number> => {
  const positionByPlayerId = new Map<string, number>();

  rows.forEach((row, index) => {
    positionByPlayerId.set(row.playerId, index + 1);
  });

  return positionByPlayerId;
};

// Acrescenta jogos disputados, média por partida, títulos e variação de
// posição a um ranking de artilheiros/assistências — todos calculados
// sobre o time exibido do líder (aproximação: não existe registro de
// presença do jogador em cada partida nem de quem estava no elenco
// campeão, só de quem marcou/assistiu — ver HallOfFameLeader).
// positionChange é previousPosition - currentPosition: positivo = subiu
// essa quantidade de posições, negativo = desceu, null = não aparecia no
// ranking anterior (ver previousPositionByPlayerId).
export const toHallOfFameLeaders = (
  leaders: GoalLeader[],
  matchesPerTeam: Map<string, number>,
  titlesPerTeam: Map<string, number>,
  previousPositionByPlayerId: Map<string, number>,
): HallOfFameLeader[] =>
  leaders.map((leader, index) => {
    const matchesPlayed = matchesPerTeam.get(leader.team.id) ?? 0;
    const average = matchesPlayed === 0 ? 0 : leader.count / matchesPlayed;
    const previousPosition = previousPositionByPlayerId.get(leader.player.id);

    return {
      ...leader,
      matchesPlayed,
      average: Math.round(average * 100) / 100,
      titles: titlesPerTeam.get(leader.team.id) ?? 0,
      positionChange:
        previousPosition === undefined ? null : previousPosition - (index + 1),
    };
  });

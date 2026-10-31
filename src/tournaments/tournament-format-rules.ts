export type TournamentFormat =
  | 'LEAGUE'
  | 'KNOCKOUT'
  | 'GROUP_STAGE_KNOCKOUT';

interface TeamCountRule {
  allowed: number[];
}

// Liga: múltiplos de 4, de 4 a 24, todos num turno único só (ver
// generateLeagueMatches) — o campeão é o líder da tabela, sem mata-mata.
// Mata-mata e grupo+mata-mata exigem bracket "fechado" (potência de 2); no
// grupo+mata-mata os times são divididos em grupos de 4 (ver
// generateGroupStageMatches) e só os classificados de cada grupo decidem o
// título no mata-mata gerado a seguir.
export const TEAM_COUNT_RULES: Record<TournamentFormat, TeamCountRule> = {
  LEAGUE: { allowed: [4, 8, 12, 16, 20, 24] },
  KNOCKOUT: { allowed: [2, 4, 8, 16, 32, 64] },
  GROUP_STAGE_KNOCKOUT: { allowed: [4, 8, 16, 32, 64] },
};

export function isValidMaxTeams(
  format: TournamentFormat,
  maxTeams: number,
): boolean {
  return TEAM_COUNT_RULES[format].allowed.includes(maxTeams);
}

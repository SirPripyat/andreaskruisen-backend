export type TournamentFormat =
  | 'GROUP_STAGE'
  | 'KNOCKOUT'
  | 'GROUP_STAGE_KNOCKOUT';

interface TeamCountRule {
  allowed: number[];
}

// Liga: múltiplos de 4, de 4 a 24 (times divididos em grupos de 4). Mata-mata
// e grupo+mata-mata exigem bracket "fechado" (potência de 2).
export const TEAM_COUNT_RULES: Record<TournamentFormat, TeamCountRule> = {
  GROUP_STAGE: { allowed: [4, 8, 12, 16, 20, 24] },
  KNOCKOUT: { allowed: [2, 4, 8, 16, 32, 64] },
  GROUP_STAGE_KNOCKOUT: { allowed: [4, 8, 16, 32, 64] },
};

export function isValidMaxTeams(
  format: TournamentFormat,
  maxTeams: number,
): boolean {
  return TEAM_COUNT_RULES[format].allowed.includes(maxTeams);
}

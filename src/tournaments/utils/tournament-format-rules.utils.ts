import { Tournament } from '../../../generated/prisma/client';
import { GroupStageConfigSchema } from '../schemas';

export type TournamentFormat = 'LEAGUE' | 'KNOCKOUT' | 'GROUP_STAGE_KNOCKOUT';

type TeamCountRule = {
  allowed: number[];
};

// Liga: múltiplos de 4, de 4 a 24, todos num turno único só (ver
// generateLeagueMatches) — o campeão é o líder da tabela, sem mata-mata.
// Mata-mata avulso exige bracket "fechado" (potência de 2) — ver
// generateKnockoutMatches. GROUP_STAGE_KNOCKOUT não tem uma lista fixa de
// maxTeams: groupSize e qualifiersPerGroup são configuráveis por torneio
// (ver GroupStageConfigSchema), então a validação é feita por
// isValidGroupStageSetup — que não exige potência de 2 pro classificado
// total, já que buildGroupStageQualifiersBracket completa o bracket com bye
// quando precisa (ver nextPowerOfTwo).
export const TEAM_COUNT_RULES: Record<'LEAGUE' | 'KNOCKOUT', TeamCountRule> = {
  LEAGUE: { allowed: [4, 8, 12, 16, 20, 24] },
  KNOCKOUT: { allowed: [2, 4, 8, 16, 32, 64] },
};

export const isValidMaxTeams = (
  format: 'LEAGUE' | 'KNOCKOUT',
  maxTeams: number,
): boolean => TEAM_COUNT_RULES[format].allowed.includes(maxTeams);

export const isValidGroupStageSetup = (
  maxTeams: number,
  config: { groupSize: number; qualifiersPerGroup: number },
): boolean => {
  if (config.groupSize < 2) return false;
  if (config.qualifiersPerGroup < 1) return false;
  if (config.qualifiersPerGroup > config.groupSize) return false;
  if (maxTeams % config.groupSize !== 0) return false;

  const groupsCount = maxTeams / config.groupSize;
  const classifiedCount = groupsCount * config.qualifiersPerGroup;

  // Não precisa mais ser potência de 2: quando o total de classificados não
  // fecha um bracket "redondo", buildGroupStageQualifiersBracket completa
  // com bye (time que avança sem jogar) até a próxima potência de 2.
  return classifiedCount >= 2;
};

// Menor potência de 2 maior ou igual a n — tamanho do bracket de mata-mata
// que acomoda n classificados, completando o resto com bye (ver
// buildGroupStageQualifiersBracket).
export const nextPowerOfTwo = (n: number): number => {
  let power = 1;
  while (power < n) power *= 2;
  return power;
};

// Quantos times de cada grupo avançam pro mata-mata — null pra qualquer
// formato que não seja GROUP_STAGE_KNOCKOUT (os outros não têm
// groupStageConfig). Revalida o JSONB a cada leitura, mesmo princípio de
// AdvancePhaseUseCase.
export const readQualifiersPerGroup = (
  tournament: Tournament,
): number | null =>
  tournament.format === 'GROUP_STAGE_KNOCKOUT'
    ? GroupStageConfigSchema.parse(tournament.groupStageConfig)
        .qualifiersPerGroup
    : null;

import { TournamentFormat } from 'generated/prisma/enums';
import { GroupStageConfig } from '../schemas';
import { drawGroupStageGroups } from './group-stage-draw.utils';
import { generateGroupStageMatches } from './group-stage-tournament.utils';
import { generateKnockoutMatches } from './knockout-tournament.utils';
import { generateLeagueMatches } from './league-matches.utils';

type Matches = {
  homeTeamId: string;
  awayTeamId: string;
  groupLabel?: string;
  round?: number;
};

type GenerateTournamentPhase = {
  type: 'GROUP' | 'KNOCKOUT';
  name: string;
  matches: Matches[];
};

const KNOCKOUT_ROUND_NAMES: Record<number, string> = {
  2: 'Final',
  4: 'Semifinal',
  8: 'Quartas de final',
  16: 'Oitavas de final',
};

export const knockoutRoundName = (teamsCount: number, order: number): string =>
  KNOCKOUT_ROUND_NAMES[teamsCount] ?? `${order}ª rodada`;

export const buildFirstPhase = (
  format: TournamentFormat,
  teamsIds: string[],
  // Só usados (e obrigatórios) pra GROUP_STAGE_KNOCKOUT — a DTO de criação
  // garante que groupStageConfig vem preenchido nesse formato (ver
  // CreateTournamentSchema).
  groupStage?: { config: GroupStageConfig; ownedTeamIds: ReadonlySet<string> },
): GenerateTournamentPhase => {
  switch (format) {
    case 'KNOCKOUT':
      return {
        type: 'KNOCKOUT',
        name: knockoutRoundName(teamsIds.length, 1),
        matches: generateKnockoutMatches(teamsIds),
      };

    case 'GROUP_STAGE_KNOCKOUT': {
      if (!groupStage)
        throw new Error('groupStage é obrigatório para GROUP_STAGE_KNOCKOUT');

      const groups = drawGroupStageGroups(
        teamsIds,
        groupStage.ownedTeamIds,
        groupStage.config.groupSize,
        groupStage.config.keepOwnedTeamsInSameGroup,
      );

      return {
        type: 'GROUP',
        name: 'Fase de grupos',
        matches: generateGroupStageMatches(
          groups,
          groupStage.config.doubleRound,
        ),
      };
    }

    default:
      return {
        type: 'GROUP',
        name: 'Liga',
        matches: generateLeagueMatches(teamsIds),
      };
  }
};

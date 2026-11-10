import { Formation, PositionCode } from '../../../generated/prisma/client';
import { SortOrder } from '../../commons/pagination';
import { GoalLeader, TeamOwner } from '../../tournaments/types';
import { HeadToHeadRecord, RecentMatchResult, SeasonCampaign } from '../utils';

export type TeamSortField =
  | 'name'
  | 'averageOverallRating'
  | 'averageDefenseRating'
  | 'averageMidfieldRating'
  | 'averageAttackRating';

export type TeamsSort = {
  sortBy: TeamSortField;
  sortOrder: SortOrder;
};

export type UpdateTeamData = {
  name?: string;
  crestUrl?: string;
  leagueId?: string;
  formation?: Formation;
};

export type LineupSlotInput = {
  playerId: string;
  position: PositionCode;
};

export type TeamCrestDimension = {
  id: string;
  leagueName: string;
};

export type TeamWithRatings = {
  id: string;
  name: string;
  crestUrl: string;
  formation: string | null;
  league: { id: string; name: string };
  averageOverallRating: number | null;
  averageDefenseRating: number | null;
  averageMidfieldRating: number | null;
  averageAttackRating: number | null;
};

// Resumo pra tela de gerenciamento de um time (ver TeamsService.getOne):
// quem controla, campanha da temporada ativa, últimos jogos, artilheiros e
// assistências do elenco atual, e o retrospecto histórico contra cada
// adversário (maior freguês/carrasco).
export type TeamStats = {
  owner: TeamOwner | null;
  // null = não há temporada ativa (não é "zero jogos"; ver
  // computeSeasonCampaign pro caso de zero jogos numa temporada que existe).
  seasonCampaign: SeasonCampaign | null;
  lastMatches: RecentMatchResult[];
  topScorers: GoalLeader[];
  topAssists: GoalLeader[];
  biggestVictim: HeadToHeadRecord | null;
  biggestTormentor: HeadToHeadRecord | null;
};

export type TeamRow = {
  id: string;
  name: string;
  crestUrl: string;
  formation: string | null;
  leagueId: string;
  leagueName: string;
  averageOverallRating: number | null;
  averageDefenseRating: number | null;
  averageMidfieldRating: number | null;
  averageAttackRating: number | null;
};

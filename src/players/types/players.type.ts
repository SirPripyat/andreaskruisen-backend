import {
  PlayerRating,
  PositionCode,
  PreferredFoot,
  Prisma,
} from 'generated/prisma/client';
import { SortOrder } from 'src/commons/pagination';

export const PLAYER_ORDER_BY_FIELD = {
  name: 'name',
  overallRating: 'latestOverallRating',
} as const;

// Atributos de PlayerRating filtráveis por range (min/max), à exceção de
// overallRating — esse já tem seu próprio range sobre Player.latestOverallRating,
// que é cacheado e não exige olhar o histórico (ver findLatestRatingPlayerIds).
export const SKILL_RATING_FIELDS = [
  'skillMoves',
  'weakFootAbility',
  'pac',
  'sho',
  'pas',
  'dri',
  'def',
  'phy',
  'acceleration',
  'agility',
  'jumping',
  'stamina',
  'strength',
  'aggression',
  'balance',
  'ballControl',
  'composure',
  'crossing',
  'curve',
  'defensiveAwareness',
  'dribbling',
  'finishing',
  'freeKickAccuracy',
  'headingAccuracy',
  'interceptions',
  'longPassing',
  'longShots',
  'penalties',
  'positioning',
  'reactions',
  'shortPassing',
  'shotPower',
  'slidingTackle',
  'sprintSpeed',
  'standingTackle',
  'vision',
  'volleys',
  'gkDiving',
  'gkHandling',
  'gkKicking',
  'gkPositioning',
  'gkReflexes',
] as const;

export type SkillRatingField = (typeof SKILL_RATING_FIELDS)[number];

export type SkillRatingRanges = Partial<
  Record<SkillRatingField, { min?: number; max?: number }>
>;

export type PlayersSort = {
  sortBy: keyof typeof PLAYER_ORDER_BY_FIELD;
  sortOrder: SortOrder;
};

export type PlayersFilter = {
  name?: string;
  nationalityIds?: string[];
  leagueId?: string;
  clubId?: string;
  positions?: PositionCode[];
  preferredFoot?: PreferredFoot;
  ageMin?: number;
  ageMax?: number;
  overallMin?: number;
  overallMax?: number;
  skillRatingRanges?: SkillRatingRanges;
};

export type UpsertPlayerData = {
  eaId: number;
  name: string;
  photoUrl: string;
  birthdate: Date;
  preferredFoot: PreferredFoot;
  nationalityId: string;
  teamId: string;
  latestOverallRating: number;
};

export type PlayerPositionInput = {
  position: PositionCode;
  isPrimary: boolean;
};

export type PlayerImportSnapshot = {
  positions: PlayerPositionInput[];
  latestRating: PlayerRating | null;
};

export type PlayerTeamDimension = {
  id: string;
  teamId: string;
};

export type PlayerRatingInput = Omit<
  Prisma.PlayerRatingCreateInput,
  'id' | 'playerId' | 'player'
>;

export type PlayerListItem = {
  id: string;
  eaId: number;
  name: string;
  photoUrl: string;
  birthdate: Date;
  preferredFoot: string;
  team: { id: string; name: string; crestUrl: string };
  nationality: { id: string; name: string; flagUrl: string };
  positions: { position: string; isPrimary: boolean }[];
  latestRating: { overallRating: number; capturedAt: Date } | null;
};

export type PlayerSearchItem = PlayerListItem & { isFavorite: boolean };

export type PlayerRatingHistoryItem = Omit<PlayerRating, 'id' | 'playerId'>;

export type PlayerStats = {
  goalsScored: number;
  goalsAssisted: number;
};

export type SimilarPlayer = PlayerListItem & { similarity: number };

export type SimilarPlayersResult = {
  reference: PlayerListItem;
  results: SimilarPlayer[];
};

export type PlayerDetail = {
  id: string;
  eaId: number;
  name: string;
  photoUrl: string;
  birthdate: Date;
  preferredFoot: string;
  team: { id: string; name: string; crestUrl: string };
  nationality: { id: string; name: string; flagUrl: string };
  positions: { position: string; isPrimary: boolean }[];
  latestRating: PlayerRatingHistoryItem | null;
  stats: PlayerStats;
  isFavorite: boolean;
};

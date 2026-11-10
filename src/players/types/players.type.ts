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

export type PlayersSort = {
  sortBy: keyof typeof PLAYER_ORDER_BY_FIELD;
  sortOrder: SortOrder;
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

export type PlayerRatingHistoryItem = Omit<PlayerRating, 'id' | 'playerId'>;

export type PlayerStats = {
  goalsScored: number;
  goalsAssisted: number;
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
};

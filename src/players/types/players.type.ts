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

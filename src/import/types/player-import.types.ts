import {
  PlayerPositionInput,
  PlayerPositionRatingInput,
  PlayerRatingRoleInput,
  UpsertPlayerData,
} from '../../players/types';
import { NormalizedRating } from '../utils';

export type TeamDimension = {
  name: string;
  league: string;
  crestUrl: string;
};

export type PlayerImportFailure = {
  eaId?: number;
  name: string;
  reason: string;
};

export type PlayerImportSummary = {
  processed: number;
  ratingsInserted: number;
  skipped: number;
  failed: PlayerImportFailure[];
};

export type PreparedPlayer = {
  upsertData: UpsertPlayerData;
  positions: PlayerPositionInput[];
  rating: NormalizedRating;
  specialityIds: string[];
  // Nomes correspondentes a specialityIds (mesma ordem) — comparados contra
  // o snapshot existente em persistPlayer, que só conhece os nomes (vindos
  // do join com Speciality), não os ids resolvidos nesta importação.
  specialityNames: string[];
  roles: PlayerRatingRoleInput[];
  positionRatings: PlayerPositionRatingInput[];
};

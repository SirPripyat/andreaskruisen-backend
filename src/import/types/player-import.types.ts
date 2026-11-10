import { PlayerPositionInput, UpsertPlayerData } from '../../players/types';
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
};

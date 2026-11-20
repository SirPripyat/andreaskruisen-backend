import { PlayerPositionInput } from '../../players/types';

export type FavoritePlayerItem = {
  id: string;
  eaId: number;
  name: string;
  photoUrl: string;
  team: { id: string; name: string; crestUrl: string };
  nationality: { id: string; name: string; flagUrl: string };
  positions: PlayerPositionInput[];
  latestOverallRating: number;
  favoritedAt: Date;
};

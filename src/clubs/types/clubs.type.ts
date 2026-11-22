import { SortOrder } from '../../commons/pagination';

export type ClubSortField =
  | 'name'
  | 'averageOverallRating'
  | 'averageDefenseRating'
  | 'averageMidfieldRating'
  | 'averageAttackRating';

export type ClubsSort = {
  sortBy: ClubSortField;
  sortOrder: SortOrder;
};

export type ClubWithRatings = {
  id: string;
  name: string;
  crestUrl: string;
  formation: string | null;
  league: { id: string; name: string; logoUrl: string };
  averageOverallRating: number | null;
  averageDefenseRating: number | null;
  averageMidfieldRating: number | null;
  averageAttackRating: number | null;
};

export type ClubRow = {
  id: string;
  name: string;
  crestUrl: string;
  formation: string | null;
  leagueId: string;
  leagueName: string;
  leagueLogo: string;
  averageOverallRating: number | null;
  averageDefenseRating: number | null;
  averageMidfieldRating: number | null;
  averageAttackRating: number | null;
};

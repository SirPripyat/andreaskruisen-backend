import { Nationality } from 'generated/prisma/client';
import { SortOrder } from '../../commons/pagination';

export type LeagueSortField = 'name';

export type LeaguesSort = {
  sortBy: LeagueSortField;
  sortOrder: SortOrder;
};

export type UpdateLeagueData = {
  name?: string;
  logoUrl?: string;
  countryId?: string | null;
};

export type League = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export type LeagueWithCountry = League & {
  country: Nationality | null;
};

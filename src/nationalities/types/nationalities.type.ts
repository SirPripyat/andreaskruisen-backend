import { SortOrder } from '../../commons/pagination';

export type NationalitySortField = 'name';

export type NationalitiesSort = {
  sortBy: NationalitySortField;
  sortOrder: SortOrder;
};

export type UpdateNationalityData = {
  name?: string;
  flagUrl?: string;
};

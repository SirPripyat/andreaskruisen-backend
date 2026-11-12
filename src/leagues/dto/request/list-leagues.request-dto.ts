import { z } from 'zod';
import {
  createSortSchema,
  PaginationSchema,
} from '../../../commons/pagination';

const LEAGUE_SORT_FIELDS = ['name'] as const;

export const ListLeaguesSchema = PaginationSchema.extend({
  name: z.string().trim().min(1).optional(),
}).extend(createSortSchema(LEAGUE_SORT_FIELDS, 'name').shape);

export type ListLeaguesRequestDTO = z.infer<typeof ListLeaguesSchema>;

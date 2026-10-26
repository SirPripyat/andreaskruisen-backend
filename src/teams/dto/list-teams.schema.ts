import { z } from 'zod';
import { createSortSchema, PaginationSchema } from '../../commons/pagination';

const TEAM_SORT_FIELDS = ['name'] as const;

export const ListTeamsSchema = PaginationSchema.extend({
  name: z.string().trim().min(1).optional(),
}).merge(createSortSchema(TEAM_SORT_FIELDS, 'name'));

export type ListTeamsQuery = z.infer<typeof ListTeamsSchema>;

import { z } from 'zod';
import { createSortSchema, PaginationSchema } from '../../commons/pagination';

const PLAYER_SORT_FIELDS = ['name', 'overallRating'] as const;

export const ListPlayersSchema = PaginationSchema.extend({
  name: z.string().trim().min(1).optional(),
}).merge(createSortSchema(PLAYER_SORT_FIELDS, 'name'));

export type ListPlayersQuery = z.infer<typeof ListPlayersSchema>;

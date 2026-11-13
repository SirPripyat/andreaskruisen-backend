import { z } from 'zod';
import { createSortSchema, PaginationSchema } from '../../commons/pagination';

const NATIONALITY_SORT_FIELDS = ['name'] as const;

export const ListNationalitiesSchema = PaginationSchema.extend({
  name: z.string().trim().min(1).optional(),
}).extend(createSortSchema(NATIONALITY_SORT_FIELDS, 'name').shape);

export type ListNationalitiesQuery = z.infer<typeof ListNationalitiesSchema>;

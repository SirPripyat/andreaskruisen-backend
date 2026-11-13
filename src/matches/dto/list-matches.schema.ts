import { z } from 'zod';
import { PaginationSchema } from '../../commons/pagination';

export const ListMatchesSchema = PaginationSchema.extend({
  tournamentId: z.uuid(),
  round: z.coerce.number().int().min(1).optional(),
});

export type ListMatchesQuery = z.infer<typeof ListMatchesSchema>;

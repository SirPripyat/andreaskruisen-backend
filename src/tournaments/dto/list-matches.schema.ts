import { z } from 'zod';
import { PaginationSchema } from '../../commons/pagination';

export const ListMatchesSchema = PaginationSchema.extend({
  // Rodada (Phase.order) a listar. Default: a fase atual do torneio.
  round: z.coerce.number().int().min(1).optional(),
});

export type ListMatchesQuery = z.infer<typeof ListMatchesSchema>;

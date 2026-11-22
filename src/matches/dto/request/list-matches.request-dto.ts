import { z } from 'zod';
import { PaginationSchema } from '../../../commons/pagination';
import { booleanQueryParam } from '../../../commons/query-boolean.schema';

export const ListMatchesSchema = PaginationSchema.extend({
  tournamentId: z.uuid(),
  round: z.coerce.number().int().min(1).optional(),
  // Quando true, mostra só as partidas com pelo menos um time com dono
  // (Squad) nessa temporada — ver GetSituationSchema, que usa o mesmo
  // conceito e nome pro mesmo filtro.
  onlyOwnedTeams: booleanQueryParam(false),
});

export type ListMatchesRequestDTO = z.infer<typeof ListMatchesSchema>;

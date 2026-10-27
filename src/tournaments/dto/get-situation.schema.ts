import { z } from 'zod';
import { booleanQueryParam } from '../../commons/query-boolean.schema';

export const GetSituationSchema = z.object({
  // Quando true, esconde grupos/confrontos sem nenhum time com dono
  // (Squad) nessa temporada — ou seja, times só de CPU.
  onlyOwnedTeams: booleanQueryParam(false),
  // Fase (Phase.order) a consultar. Default: a fase atual do torneio — ver
  // ListMatchesSchema, que usa o mesmo nome pro mesmo conceito.
  round: z.coerce.number().int().min(1).optional(),
});

export type GetSituationQuery = z.infer<typeof GetSituationSchema>;

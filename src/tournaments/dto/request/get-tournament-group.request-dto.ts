import { z } from 'zod';

export const GetTournamentGroupSchema = z.object({
  // Fase (Phase.order) a consultar. Default: a fase atual do torneio — ver
  // GetSituationSchema, que usa o mesmo nome pro mesmo conceito.
  round: z.coerce.number().int().min(1).optional(),
});

export type GetTournamentGroupRequestDTO = z.infer<
  typeof GetTournamentGroupSchema
>;

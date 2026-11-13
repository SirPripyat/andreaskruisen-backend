import { z } from 'zod';

export const GetSimilarPlayersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type GetSimilarPlayersRequestDTO = z.infer<
  typeof GetSimilarPlayersSchema
>;

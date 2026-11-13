import { z } from 'zod';

export const SimilarPlayersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type SimilarPlayersQuery = z.infer<typeof SimilarPlayersSchema>;

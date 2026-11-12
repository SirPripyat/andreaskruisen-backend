import { z } from 'zod';

export const SelectSeasonSchema = z.object({
  seasonId: z.uuid(),
});

export type SelectSeasonRequestDTO = z.infer<typeof SelectSeasonSchema>;

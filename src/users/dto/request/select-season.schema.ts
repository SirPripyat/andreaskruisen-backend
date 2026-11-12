import { z } from 'zod';

export const SelectSeasonSchema = z.object({
  seasonId: z.string().uuid(),
});

export type SelectSeason = z.infer<typeof SelectSeasonSchema>;

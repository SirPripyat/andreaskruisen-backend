import { z } from 'zod';

export const CreateSeasonSchema = z.object({
  name: z.string().min(1),
});

export type CreateSeason = z.infer<typeof CreateSeasonSchema>;

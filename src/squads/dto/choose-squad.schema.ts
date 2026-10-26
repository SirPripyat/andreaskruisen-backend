import { z } from 'zod';

export const ChooseSquadSchema = z.object({
  teamId: z.string().uuid(),
});

export type ChooseSquad = z.infer<typeof ChooseSquadSchema>;

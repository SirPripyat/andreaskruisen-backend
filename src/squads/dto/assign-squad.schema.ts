import { z } from 'zod';

export const AssignSquadSchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid(),
});

export type AssignSquad = z.infer<typeof AssignSquadSchema>;

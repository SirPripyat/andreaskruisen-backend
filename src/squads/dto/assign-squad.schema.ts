import { z } from 'zod';

export const AssignSquadSchema = z.object({
  userId: z.uuid(),
  teamId: z.uuid(),
});

export type AssignSquad = z.infer<typeof AssignSquadSchema>;

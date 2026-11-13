import { z } from 'zod';

export const AssignSquadSchema = z.object({
  userId: z.uuid(),
  teamId: z.uuid(),
});

export type AssignSquadRequestDTO = z.infer<typeof AssignSquadSchema>;

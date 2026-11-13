import { z } from 'zod';

export const ChooseSquadSchema = z.object({
  teamId: z.uuid(),
});

export type ChooseSquadRequestDTO = z.infer<typeof ChooseSquadSchema>;

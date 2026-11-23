import { z } from 'zod';

export const GetHallOfFameSchema = z.object({
  format: z.enum(['LEAGUE', 'KNOCKOUT', 'GROUP_STAGE_KNOCKOUT']),
});

export type GetHallOfFameRequestDTO = z.infer<typeof GetHallOfFameSchema>;

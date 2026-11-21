import { z } from 'zod';

export const SimulateMatchesBulkSchema = z.object({
  matchIds: z.array(z.uuid()).min(1).max(100),
});

export type SimulateMatchesBulkRequestDTO = z.infer<
  typeof SimulateMatchesBulkSchema
>;

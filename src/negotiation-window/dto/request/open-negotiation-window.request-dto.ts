import { z } from 'zod';

export const OpenNegotiationWindowSchema = z.object({
  feeEnabled: z.boolean(),
});

export type OpenNegotiationWindowRequestDTO = z.infer<
  typeof OpenNegotiationWindowSchema
>;

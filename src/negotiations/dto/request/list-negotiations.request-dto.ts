import { z } from 'zod';

export const ListNegotiationsSchema = z.object({
  direction: z.enum(['sent', 'received']),
});

export type ListNegotiationsQueryDTO = z.infer<typeof ListNegotiationsSchema>;

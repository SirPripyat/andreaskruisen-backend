import { z } from 'zod';

export const CreateTransferSchema = z
  .object({
    outgoingPlayerId: z.string().uuid(),
    incomingPlayerId: z.string().uuid(),
  })
  .refine((data) => data.outgoingPlayerId !== data.incomingPlayerId, {
    message: 'Os jogadores precisam ser diferentes',
    path: ['incomingPlayerId'],
  });

export type CreateTransfer = z.infer<typeof CreateTransferSchema>;

import { z } from 'zod';

export const CreateTransferSchema = z
  .object({
    outgoingPlayerId: z.uuid(),
    incomingPlayerId: z.uuid(),
  })
  .refine((data) => data.outgoingPlayerId !== data.incomingPlayerId, {
    message: 'Os jogadores precisam ser diferentes',
    path: ['incomingPlayerId'],
  });

export type CreateTransferRequestDTO = z.infer<typeof CreateTransferSchema>;

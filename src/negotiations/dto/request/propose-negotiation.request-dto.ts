import { z } from 'zod';

export const ProposeNegotiationSchema = z
  .object({
    targetTeamId: z.uuid(),
    outgoingPlayerId: z.uuid().optional(),
    incomingPlayerId: z.uuid().optional(),
    coinAmount: z.number().int().optional(),
  })
  .refine(
    (data) => Boolean(data.outgoingPlayerId) || Boolean(data.incomingPlayerId),
    {
      message: 'A negociação precisa envolver ao menos um jogador',
      path: ['incomingPlayerId'],
    },
  )
  .refine(
    (data) =>
      !data.outgoingPlayerId ||
      !data.incomingPlayerId ||
      data.outgoingPlayerId !== data.incomingPlayerId,
    {
      message: 'Os jogadores precisam ser diferentes',
      path: ['incomingPlayerId'],
    },
  )
  .refine((data) => data.coinAmount !== 0, {
    message: 'Informe um valor diferente de zero ou omita o campo',
    path: ['coinAmount'],
  });

export type ProposeNegotiationRequestDTO = z.infer<
  typeof ProposeNegotiationSchema
>;

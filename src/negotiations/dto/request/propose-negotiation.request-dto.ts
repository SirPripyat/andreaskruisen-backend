import { z } from 'zod';

// Sem fiscalização automática (ver seção 5 do regulamento): cada tipo exige
// só os campos que fazem sentido pra descrever o acordo, servem de registro
// pra consulta/auditoria entre os participantes.
const NegotiationClauseBaseFields = {
  playerId: z.uuid(),
  terms: z.string().min(1).optional(),
};

export const NegotiationClauseInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('LEI_DO_EX'),
    ...NegotiationClauseBaseFields,
    matchesCount: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('DIREITO_DE_RECOMPRA'),
    ...NegotiationClauseBaseFields,
    amount: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('PREFERENCIA_DE_COMPRA'),
    ...NegotiationClauseBaseFields,
  }),
  z.object({
    type: z.literal('BONUS_POR_TITULO'),
    ...NegotiationClauseBaseFields,
    amount: z.number().int().positive(),
  }),
]);

export type NegotiationClauseInputDTO = z.infer<
  typeof NegotiationClauseInputSchema
>;

export const ProposeNegotiationSchema = z
  .object({
    targetTeamId: z.uuid(),
    outgoingPlayerId: z.uuid().optional(),
    incomingPlayerId: z.uuid().optional(),
    coinAmount: z.number().int().optional(),
    clauses: z.array(NegotiationClauseInputSchema).optional().default([]),
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

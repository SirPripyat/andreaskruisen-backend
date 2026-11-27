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

// Até 2 jogadores de cada lado (troca multi-jogador, mesma regra do
// mercado tradicional — ver v1-transferencias.md e
// transfer-pricing.utils.ts). Vazio ([]) representa o mesmo que o antigo
// null: compra direta (sem outgoing) ou venda (sem incoming).
const playerIdsField = z.array(z.uuid()).max(2).optional().default([]);

export const ProposeNegotiationSchema = z
  .object({
    targetTeamId: z.uuid(),
    outgoingPlayerIds: playerIdsField,
    incomingPlayerIds: playerIdsField,
    coinAmount: z.number().int().optional(),
    clauses: z.array(NegotiationClauseInputSchema).optional().default([]),
  })
  .refine(
    (data) =>
      data.outgoingPlayerIds.length > 0 || data.incomingPlayerIds.length > 0,
    {
      message: 'A negociação precisa envolver ao menos um jogador',
      path: ['incomingPlayerIds'],
    },
  )
  .refine(
    (data) =>
      new Set(data.outgoingPlayerIds).size === data.outgoingPlayerIds.length,
    { message: 'Jogadores que saem repetidos', path: ['outgoingPlayerIds'] },
  )
  .refine(
    (data) =>
      new Set(data.incomingPlayerIds).size === data.incomingPlayerIds.length,
    { message: 'Jogadores que entram repetidos', path: ['incomingPlayerIds'] },
  )
  .refine(
    (data) =>
      data.outgoingPlayerIds.every(
        (id) => !data.incomingPlayerIds.includes(id),
      ),
    {
      message: 'Os jogadores precisam ser diferentes',
      path: ['incomingPlayerIds'],
    },
  )
  .refine((data) => data.coinAmount !== 0, {
    message: 'Informe um valor diferente de zero ou omita o campo',
    path: ['coinAmount'],
  });

export type ProposeNegotiationRequestDTO = z.infer<
  typeof ProposeNegotiationSchema
>;

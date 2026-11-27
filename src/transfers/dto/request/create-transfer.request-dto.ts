import { z } from 'zod';

// Esse schema valida tanto o body (POST, JSON de verdade) quanto a query
// string (GET /quote, só texto) — por isso aceita boolean ou o literal
// "true"/"false" (nunca z.coerce.boolean(), que trataria "false" como truthy).
const useCouponField = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .optional()
  .default(false)
  .transform((value) => (typeof value === 'string' ? value === 'true' : value));

// Mesmo problema do useCouponField: na query string (GET /quote) um único
// id chega como string solta, não como array de 1 elemento — por isso
// aceita os dois formatos e normaliza pra array. Máximo 2 jogadores de
// cada lado (troca multi-jogador, ver v1-transferencias.md).
const playerIdsField = z
  .union([z.uuid(), z.array(z.uuid())])
  .transform((value) => (Array.isArray(value) ? value : [value]))
  .pipe(z.array(z.uuid()).min(1).max(2));

export const CreateTransferSchema = z
  .object({
    outgoingPlayerIds: playerIdsField,
    incomingPlayerIds: playerIdsField,
    useCoupon: useCouponField,
    // Só respeitado quando quem faz a requisição é ADMIN (ver
    // CreateTransferUseCase) — participante sempre é o próprio solicitante.
    requestedByUserId: z.uuid().optional(),
  })
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
  );

export type CreateTransferRequestDTO = z.infer<typeof CreateTransferSchema>;

import { z } from 'zod';

// Esse schema valida tanto o body (POST, JSON de verdade) quanto a query
// string (GET /quote, só texto) — por isso aceita boolean ou o literal
// "true"/"false" (nunca z.coerce.boolean(), que trataria "false" como truthy).
const useCouponField = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .optional()
  .default(false)
  .transform((value) => (typeof value === 'string' ? value === 'true' : value));

export const CreateTransferSchema = z
  .object({
    outgoingPlayerId: z.uuid(),
    incomingPlayerId: z.uuid(),
    useCoupon: useCouponField,
    // Só respeitado quando quem faz a requisição é ADMIN (ver
    // CreateTransferUseCase) — participante sempre é o próprio solicitante.
    requestedByUserId: z.uuid().optional(),
  })
  .refine((data) => data.outgoingPlayerId !== data.incomingPlayerId, {
    message: 'Os jogadores precisam ser diferentes',
    path: ['incomingPlayerId'],
  });

export type CreateTransferRequestDTO = z.infer<typeof CreateTransferSchema>;

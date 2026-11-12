import { z } from 'zod';

export const UpdateMeSchema = z
  .object({
    name: z
      .string()
      .min(4, "User's name should have at leat 4 characters")
      .optional(),
    pin: z
      .string()
      .regex(/^\d{4,6}$/)
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.pin !== undefined, {
    message: 'Informe nome ou pin para atualizar',
  });

export type UpdateMeRequestDTO = z.infer<typeof UpdateMeSchema>;

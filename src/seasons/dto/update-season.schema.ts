import { z } from 'zod';

export const UpdateSeasonSchema = z
  .object({
    name: z.string().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type UpdateSeason = z.infer<typeof UpdateSeasonSchema>;

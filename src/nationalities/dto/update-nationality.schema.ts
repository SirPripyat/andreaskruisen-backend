import { z } from 'zod';

export const UpdateNationalitySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    flagUrl: z.string().trim().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type UpdateNationality = z.infer<typeof UpdateNationalitySchema>;

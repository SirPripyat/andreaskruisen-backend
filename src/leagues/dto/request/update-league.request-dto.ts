import { z } from 'zod';

export const UpdateLeagueSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    logoUrl: z.string().trim().min(1).optional(),
    countryId: z.uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type UpdateLeagueRequestDTO = z.infer<typeof UpdateLeagueSchema>;

import { z } from 'zod';
import { FORMATION_DISPLAY_TO_ENUM } from '../../import/utils/formation-mapper.utils';

const KNOWN_FORMATIONS = Object.keys(FORMATION_DISPLAY_TO_ENUM) as [
  string,
  ...string[],
];

export const UpdateTeamSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    crestUrl: z.string().trim().min(1).optional(),
    leagueId: z.uuid().optional(),
    formation: z.enum(KNOWN_FORMATIONS).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type UpdateTeam = z.infer<typeof UpdateTeamSchema>;

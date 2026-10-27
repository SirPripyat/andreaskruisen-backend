import { z } from 'zod';
import { isValidMaxTeams } from '../tournament-format-rules';

export const CreateTournamentSchema = z
  .object({
    name: z.string().min(1),
    format: z.enum(['GROUP_STAGE', 'KNOCKOUT', 'GROUP_STAGE_KNOCKOUT']),
    maxTeams: z.number().int(),
    // Elenco completo do torneio: precisa estar aqui porque as partidas da
    // primeira fase já são geradas na criação (ver TournamentsService.create).
    teamIds: z.array(z.string().uuid()),
  })
  .refine((data) => isValidMaxTeams(data.format, data.maxTeams), {
    message: 'Número de times inválido para esse formato de torneio',
    path: ['maxTeams'],
  })
  .refine((data) => data.teamIds.length === data.maxTeams, {
    message: 'A quantidade de times deve ser igual a maxTeams',
    path: ['teamIds'],
  })
  .refine((data) => new Set(data.teamIds).size === data.teamIds.length, {
    message: 'Cada time só pode aparecer uma vez',
    path: ['teamIds'],
  });

export type CreateTournament = z.infer<typeof CreateTournamentSchema>;

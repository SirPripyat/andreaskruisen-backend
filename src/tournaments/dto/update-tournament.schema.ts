import { z } from 'zod';

// format e maxTeams não são editáveis depois da criação: as partidas da
// primeira fase já foram geradas a partir deles (ver TournamentsService.create).
export const UpdateTournamentSchema = z.object({
  name: z.string().min(1),
});

export type UpdateTournament = z.infer<typeof UpdateTournamentSchema>;

import { z } from 'zod';
import { booleanQueryParam } from '../../../commons/query-boolean.schema';

export const GetTournamentFixturesSchema = z.object({
  // Mesmo filtro e nome de GetSituationSchema: quando true, mostra só as
  // partidas com pelo menos um time com dono (Squad) nessa temporada.
  onlyOwnedTeams: booleanQueryParam(false),
});

export type GetTournamentFixturesRequestDTO = z.infer<
  typeof GetTournamentFixturesSchema
>;

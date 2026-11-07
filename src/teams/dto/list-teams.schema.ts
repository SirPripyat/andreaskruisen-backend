import { z } from 'zod';
import { createSortSchema, PaginationSchema } from '../../commons/pagination';
import { booleanQueryParam } from '../../commons/query-boolean.schema';

// Mesmos nomes dos campos retornados na resposta (averageOverallRating etc.),
// pra quem consome a API poder ordenar pela mesma chave que já recebeu.
const TEAM_SORT_FIELDS = [
  'name',
  'averageOverallRating',
  'averageDefenseRating',
  'averageMidfieldRating',
  'averageAttackRating',
] as const;

export const ListTeamsSchema = PaginationSchema.extend({
  name: z.string().trim().min(1).optional(),
  leagueId: z.string().uuid().optional(),
  // Pra achar times ainda não importados do JSON de formações (ver
  // TeamsService.importFormationsFromJson).
  withoutFormation: booleanQueryParam(false),
}).merge(createSortSchema(TEAM_SORT_FIELDS, 'name'));

export type ListTeamsQuery = z.infer<typeof ListTeamsSchema>;

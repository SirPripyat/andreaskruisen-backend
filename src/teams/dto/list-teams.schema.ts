import { z } from 'zod';
import { createSortSchema, PaginationSchema } from '../../commons/pagination';

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
}).merge(createSortSchema(TEAM_SORT_FIELDS, 'name'));

export type ListTeamsQuery = z.infer<typeof ListTeamsSchema>;

import { z } from 'zod';
import {
  createSortSchema,
  PaginationSchema,
} from '../../../commons/pagination';

// Mesmos nomes dos campos retornados na resposta (averageOverallRating etc.),
// pra quem consome a API poder ordenar pela mesma chave que já recebeu.
const CLUB_SORT_FIELDS = [
  'name',
  'averageOverallRating',
  'averageDefenseRating',
  'averageMidfieldRating',
  'averageAttackRating',
] as const;

export const ListClubsSchema = PaginationSchema.extend({
  name: z.string().trim().min(1).optional(),
  leagueId: z.uuid().optional(),
}).extend(createSortSchema(CLUB_SORT_FIELDS, 'name').shape);

export type ListClubsRequestDTO = z.infer<typeof ListClubsSchema>;

import { createSortSchema, PaginationSchema } from 'src/commons/pagination';
import { csvArray } from 'src/commons/schemas';
import { SKILL_RATING_FIELDS } from 'src/players/types';
import { z } from 'zod';

const PLAYER_SORT_FIELDS = ['name', 'overallRating'] as const;

const POSITION_CODES = [
  'GOL',
  'ZAG',
  'LD',
  'LE',
  'VOL',
  'MC',
  'MD',
  'ME',
  'MEI',
  'PD',
  'PE',
  'ATA',
] as const;

const PREFERRED_FOOT_VALUES = ['LEFT', 'RIGHT'] as const;

// Um par de query params min/max por atributo de PlayerRating (ex.:
// finishingMin/finishingMax), gerado a partir da mesma lista usada pra
// resolver o filtro contra a captura mais recente de cada jogador.
const skillRangeFields = Object.fromEntries(
  SKILL_RATING_FIELDS.flatMap((field) => [
    [`${field}Min`, z.coerce.number().int().optional()],
    [`${field}Max`, z.coerce.number().int().optional()],
  ]),
);

export const ListPlayersSchema = PaginationSchema.extend({
  name: z.string().trim().min(1).optional(),
  nationalityIds: csvArray(z.string().min(1)),
  leagueId: z.string().min(1).optional(),
  clubId: z.string().min(1).optional(),
  positions: csvArray(z.enum(POSITION_CODES)),
  preferredFoot: z.enum(PREFERRED_FOOT_VALUES).optional(),
  ageMin: z.coerce.number().int().min(0).optional(),
  ageMax: z.coerce.number().int().min(0).optional(),
  overallMin: z.coerce.number().int().min(0).max(99).optional(),
  overallMax: z.coerce.number().int().min(0).max(99).optional(),
  ...skillRangeFields,
})
  .extend(createSortSchema(PLAYER_SORT_FIELDS, 'overallRating', 'desc').shape)
  .refine(
    (query) =>
      query.ageMin === undefined ||
      query.ageMax === undefined ||
      query.ageMin <= query.ageMax,
    { message: 'ageMin não pode ser maior que ageMax', path: ['ageMin'] },
  )
  .refine(
    (query) =>
      query.overallMin === undefined ||
      query.overallMax === undefined ||
      query.overallMin <= query.overallMax,
    {
      message: 'overallMin não pode ser maior que overallMax',
      path: ['overallMin'],
    },
  );

export type ListPlayersRequestDTO = z.infer<typeof ListPlayersSchema>;

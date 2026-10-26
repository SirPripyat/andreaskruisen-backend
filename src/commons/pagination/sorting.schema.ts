import { z } from 'zod';

export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

// Gera um schema {sortBy, sortOrder} validando sortBy contra os campos que
// aquela listagem permite ordenar (cada entidade declara os seus próprios).
export function createSortSchema<T extends readonly [string, ...string[]]>(
  fields: T,
  defaultField: T[number],
) {
  const sortBySchema = z.enum(fields);

  // z.enum's generic inference can't resolve T[number] back to its own
  // literal union inside this function body, even though callers always get
  // the right union from `fields`. Narrowing here is safe but unprovable to tsc.
  return z.object({
    // biome-ignore lint/suspicious/noExplicitAny: see comment above
    sortBy: sortBySchema.default(defaultField as any),
    sortOrder: SortOrderSchema.default('asc'),
  });
}

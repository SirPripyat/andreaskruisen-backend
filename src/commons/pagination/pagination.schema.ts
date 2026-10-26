import { z } from 'zod';

// Schema base de paginação por página/tamanho de página. Outros módulos
// estendem esse schema com seus próprios filtros (ex.: PaginationSchema.extend({ name: ... })).
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationSchema>;

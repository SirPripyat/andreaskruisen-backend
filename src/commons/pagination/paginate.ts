import { PaginationQuery } from './pagination.schema';

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Executa count + findMany de qualquer repositório em paralelo e monta a
// resposta paginada no formato padrão. Quem chama só fornece as duas queries
// (já com o where/orderBy/include que fizer sentido pra entidade).
export async function paginate<T>(
  countQuery: () => Promise<number>,
  findQuery: (args: { skip: number; take: number }) => Promise<T[]>,
  query: PaginationQuery,
): Promise<PaginatedResult<T>> {
  const skip = (query.page - 1) * query.pageSize;

  const [total, data] = await Promise.all([
    countQuery(),
    findQuery({ skip, take: query.pageSize }),
  ]);

  return {
    data,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

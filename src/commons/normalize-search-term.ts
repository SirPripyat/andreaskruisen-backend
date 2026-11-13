// Mesma normalização aplicada pela coluna gerada "nameSearch" no banco
// (lower(unaccent(name)) — ver migration add_name_search_unaccent), só que
// do lado do termo de busca digitado. Sem isso, comparar um termo com
// acento (ou maiúsculas) contra a coluna já normalizada nunca bateria.
export const normalizeSearchTerm = (term: string): string =>
  term.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

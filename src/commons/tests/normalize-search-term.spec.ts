import { normalizeSearchTerm } from '../normalize-search-term';

describe('normalizeSearchTerm', () => {
  it('remove acentos', () => {
    expect(normalizeSearchTerm('São Paulo')).toBe('sao paulo');
  });

  it('ignora caixa', () => {
    expect(normalizeSearchTerm('AJAX')).toBe('ajax');
  });

  it('mantém termos já normalizados', () => {
    expect(normalizeSearchTerm('flamengo')).toBe('flamengo');
  });

  it('lida com múltiplos acentos diferentes', () => {
    expect(normalizeSearchTerm('Júlio César Ñandú')).toBe('julio cesar nandu');
  });
});

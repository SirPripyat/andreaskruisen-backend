import { normalizeStatsKeys } from './stats-label-mapper';

describe('normalizeStatsKeys', () => {
  it('translates pt-BR SoFIFA labels to canonical English keys', () => {
    expect(
      normalizeStatsKeys({
        Cruzamento: 58,
        Finalização: 96,
        'Precisão no Cabeceio': 85,
        'Elasticidade GL': 7,
        'Posicion. GL': 11,
      }),
    ).toEqual({
      crossing: 58,
      finishing: 96,
      headingAccuracy: 85,
      gkDiving: 7,
      gkPositioning: 11,
    });
  });

  it('passes through keys that are already in canonical English form', () => {
    expect(normalizeStatsKeys({ crossing: 58, pac: 69 })).toEqual({
      crossing: 58,
      pac: 69,
    });
  });
});

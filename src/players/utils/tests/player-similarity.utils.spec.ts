import {
  AttributeVector,
  computeSimilarity,
  GOALKEEPER_ATTRIBUTE_FIELDS,
  OUTFIELD_ATTRIBUTE_FIELDS,
} from '../player-similarity.utils';

// Um PlayerRating real sempre tem os dois conjuntos de campos preenchidos
// (gk* existe até em jogador de linha, só com valores baixos), então os
// vetores de teste replicam isso em vez de usar objetos parciais.
const buildVector = (value: number): AttributeVector => {
  const vector = {} as AttributeVector;

  [...OUTFIELD_ATTRIBUTE_FIELDS, ...GOALKEEPER_ATTRIBUTE_FIELDS].forEach(
    (field) => {
      vector[field] = value;
    },
  );

  return vector;
};

describe('computeSimilarity', () => {
  it('returns 100 for identical vectors', () => {
    const reference = buildVector(80);

    expect(
      computeSimilarity(reference, reference, {
        fields: OUTFIELD_ATTRIBUTE_FIELDS,
      }),
    ).toBe(100);
  });

  it('returns ~0 for vectors at opposite extremes', () => {
    const reference = buildVector(0);
    const candidate = buildVector(99);

    expect(
      computeSimilarity(reference, candidate, {
        fields: OUTFIELD_ATTRIBUTE_FIELDS,
      }),
    ).toBe(0);
  });

  it('scores a partial mismatch between the two extremes', () => {
    const reference = buildVector(50);
    const candidate = buildVector(60);

    const similarity = computeSimilarity(reference, candidate, {
      fields: OUTFIELD_ATTRIBUTE_FIELDS,
    });

    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(100);
  });

  it('never mixes goalkeeper players in outfield comparisons', () => {
    const outfieldPlayer = buildVector(80);
    const goalkeeper = { ...buildVector(80) };
    GOALKEEPER_ATTRIBUTE_FIELDS.forEach((field) => {
      goalkeeper[field] = 20;
    });

    // Atributos de linha idênticos, mas a comparação de goleiro usa só os
    // campos gk* — onde os dois divergem — então o score cai mesmo com o
    // resto do vetor igual, confirmando que os conjuntos não se misturam.
    const outfieldSimilarity = computeSimilarity(outfieldPlayer, goalkeeper, {
      fields: OUTFIELD_ATTRIBUTE_FIELDS,
    });
    const goalkeeperSimilarity = computeSimilarity(outfieldPlayer, goalkeeper, {
      fields: GOALKEEPER_ATTRIBUTE_FIELDS,
    });

    expect(outfieldSimilarity).toBe(100);
    expect(goalkeeperSimilarity).toBeLessThan(100);
  });

  it('weighs attributes according to the given weight map', () => {
    const reference = buildVector(50);
    const candidate = buildVector(50);
    candidate.finishing = 99;

    const unweighted = computeSimilarity(reference, candidate, {
      fields: OUTFIELD_ATTRIBUTE_FIELDS,
    });
    const weighted = computeSimilarity(reference, candidate, {
      fields: OUTFIELD_ATTRIBUTE_FIELDS,
      weights: { finishing: 5 },
    });

    expect(weighted).toBeLessThan(unweighted);
  });
});

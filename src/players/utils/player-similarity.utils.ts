// Atributos granulares (0-99) usados no vetor de similaridade. Ficam fora
// os pilares pac/sho/pas/dri/def/phy (nullable/legados, criariam buracos) e
// skillMoves/weakFootAbility (escala 1-5, não 0-99) — ver decisão no plano.
export const OUTFIELD_ATTRIBUTE_FIELDS = [
  'acceleration',
  'agility',
  'jumping',
  'stamina',
  'strength',
  'aggression',
  'balance',
  'ballControl',
  'composure',
  'crossing',
  'curve',
  'defensiveAwareness',
  'dribbling',
  'finishing',
  'freeKickAccuracy',
  'headingAccuracy',
  'interceptions',
  'longPassing',
  'longShots',
  'penalties',
  'positioning',
  'reactions',
  'shortPassing',
  'shotPower',
  'slidingTackle',
  'sprintSpeed',
  'standingTackle',
  'vision',
  'volleys',
] as const;

export const GOALKEEPER_ATTRIBUTE_FIELDS = [
  'gkDiving',
  'gkHandling',
  'gkKicking',
  'gkPositioning',
  'gkReflexes',
] as const;

export type SimilarityAttributeField =
  | (typeof OUTFIELD_ATTRIBUTE_FIELDS)[number]
  | (typeof GOALKEEPER_ATTRIBUTE_FIELDS)[number];

export type AttributeVector = Record<SimilarityAttributeField, number>;
export type AttributeWeights = Partial<
  Record<SimilarityAttributeField, number>
>;

const MAX_RATING_VALUE = 99;

// Distância Euclidiana normalizada para 0-100. Pesos (default 1 pra todos)
// permitem priorizar atributos específicos sem reescrever o algoritmo.
export const computeSimilarity = (
  reference: AttributeVector,
  candidate: AttributeVector,
  options: {
    fields: readonly SimilarityAttributeField[];
    weights?: AttributeWeights;
  },
): number => {
  const { fields, weights } = options;

  let squaredDistance = 0;
  let maxSquaredDistance = 0;

  for (const field of fields) {
    const weight = weights?.[field] ?? 1;
    const diff = reference[field] - candidate[field];
    squaredDistance += weight * diff * diff;
    maxSquaredDistance += weight * MAX_RATING_VALUE * MAX_RATING_VALUE;
  }

  const similarity =
    1 - Math.sqrt(squaredDistance) / Math.sqrt(maxSquaredDistance);

  return Math.round(Math.max(0, Math.min(1, similarity)) * 1000) / 10;
};

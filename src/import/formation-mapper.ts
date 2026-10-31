import { Formation } from '../../generated/prisma/client';

// Mapeia o texto em português que o scraper manda (campo "formacao") pro
// enum fechado do Prisma. Única fonte de verdade sobre quais formações são
// aceitas — qualquer formação nova do EA FC que apareça aqui fora da lista
// precisa ser adicionada tanto aqui quanto no enum Formation do schema.
export const FORMATION_DISPLAY_TO_ENUM: Record<string, Formation> = {
  '3-1-4-2': Formation.THREE_ONE_FOUR_TWO,
  '3-4-1-2': Formation.THREE_FOUR_ONE_TWO,
  '3-4-2-1': Formation.THREE_FOUR_TWO_ONE,
  '3-4-3': Formation.THREE_FOUR_THREE,
  '3-4-3 Em linha': Formation.THREE_FOUR_THREE_EM_LINHA,
  '3-5-2': Formation.THREE_FIVE_TWO,
  '4-1-2-1-2 Aberto': Formation.FOUR_ONE_TWO_ONE_TWO_ABERTO,
  '4-1-2-1-2 Fechado': Formation.FOUR_ONE_TWO_ONE_TWO_FECHADO,
  '4-1-3-2': Formation.FOUR_ONE_THREE_TWO,
  '4-1-4-1': Formation.FOUR_ONE_FOUR_ONE,
  '4-2-1-3': Formation.FOUR_TWO_ONE_THREE,
  '4-2-2-2': Formation.FOUR_TWO_TWO_TWO,
  '4-2-3-1 Aberto': Formation.FOUR_TWO_THREE_ONE_ABERTO,
  '4-2-3-1 Fechado': Formation.FOUR_TWO_THREE_ONE_FECHADO,
  '4-3-1-2': Formation.FOUR_THREE_ONE_TWO,
  '4-3-2-1': Formation.FOUR_THREE_TWO_ONE,
  '4-3-3 Conservador': Formation.FOUR_THREE_THREE_CONSERVADOR,
  '4-3-3 Defensivo': Formation.FOUR_THREE_THREE_DEFENSIVO,
  '4-3-3 Em linha': Formation.FOUR_THREE_THREE_EM_LINHA,
  '4-3-3 Ofensivo': Formation.FOUR_THREE_THREE_OFENSIVO,
  '4-4-1-1 Meio-campo': Formation.FOUR_FOUR_ONE_ONE_MEIO_CAMPO,
  '4-4-1-1 Ofensivo': Formation.FOUR_FOUR_ONE_ONE_OFENSIVO,
  '4-4-2 Conservador': Formation.FOUR_FOUR_TWO_CONSERVADOR,
  '4-4-2 Em linha': Formation.FOUR_FOUR_TWO_EM_LINHA,
  '4-5-1 Em linha': Formation.FOUR_FIVE_ONE_EM_LINHA,
  '5-2-1-2': Formation.FIVE_TWO_ONE_TWO,
  '5-2-2-1': Formation.FIVE_TWO_TWO_ONE,
  '5-2-3': Formation.FIVE_TWO_THREE,
  '5-3-2 Conservador': Formation.FIVE_THREE_TWO_CONSERVADOR,
  '5-4-1 Em linha': Formation.FIVE_FOUR_ONE_EM_LINHA,
  '5-4-1 Losango': Formation.FIVE_FOUR_ONE_LOSANGO,
};

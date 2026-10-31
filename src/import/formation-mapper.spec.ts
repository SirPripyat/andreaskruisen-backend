import { Formation } from '../../generated/prisma/client';
import { FORMATION_DISPLAY_TO_ENUM } from './formation-mapper';

describe('formation-mapper', () => {
  it('mapeia o texto do scraper pro enum correto', () => {
    expect(FORMATION_DISPLAY_TO_ENUM['4-2-3-1 Aberto']).toBe(
      Formation.FOUR_TWO_THREE_ONE_ABERTO,
    );
    expect(FORMATION_DISPLAY_TO_ENUM['3-4-2-1']).toBe(
      Formation.THREE_FOUR_TWO_ONE,
    );
  });

  it('cobre todos os valores do enum Formation', () => {
    const enumValues = Object.values(Formation);
    const mappedValues = Object.values(FORMATION_DISPLAY_TO_ENUM);
    expect(new Set(mappedValues)).toEqual(new Set(enumValues));
  });
});

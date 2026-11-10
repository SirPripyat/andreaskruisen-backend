import { PreferredFoot } from '../../../../generated/prisma/enums';
import { mapPreferredFoot } from '../preferred-foot.utils';

describe('mapPreferredFoot', () => {
  it('mapeia "Destro" para RIGHT', () => {
    expect(mapPreferredFoot('Destro')).toBe(PreferredFoot.RIGHT);
  });

  it('mapeia "Esquerdo" para LEFT', () => {
    expect(mapPreferredFoot('Esquerdo')).toBe(PreferredFoot.LEFT);
  });
});

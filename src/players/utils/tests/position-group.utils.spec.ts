import { getPositionGroup } from '../position-group.utils';

describe('getPositionGroup', () => {
  it('isolates the goalkeeper in its own group', () => {
    expect(getPositionGroup('GOL')).toBe('GOALKEEPER');
  });

  it.each([
    ['ZAG', 'DEFENSE'],
    ['LD', 'DEFENSE'],
    ['LE', 'DEFENSE'],
    ['VOL', 'MIDFIELD'],
    ['MC', 'MIDFIELD'],
    ['MD', 'MIDFIELD'],
    ['ME', 'MIDFIELD'],
    ['MEI', 'MIDFIELD'],
    ['PD', 'ATTACK'],
    ['PE', 'ATTACK'],
    ['ATA', 'ATTACK'],
  ] as const)('maps %s to %s', (position, group) => {
    expect(getPositionGroup(position)).toBe(group);
  });
});

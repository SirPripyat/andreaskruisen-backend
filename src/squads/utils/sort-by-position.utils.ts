import { PositionCode } from '../../../generated/prisma/client';
import { RosterPlayer } from '../types';

const POSITION_DISPLAY_ORDER = new Map<PositionCode, number>(
  [
    'GOL',
    'ZAG',
    'LD',
    'LE',
    'VOL',
    'MC',
    'MD',
    'ME',
    'MEI',
    'PD',
    'PE',
    'ATA',
  ].map((position, index) => [position as PositionCode, index]),
);

export const sortByPosition = (players: RosterPlayer[]): RosterPlayer[] =>
  [...players].sort(
    (a, b) =>
      (POSITION_DISPLAY_ORDER.get(a.position) ?? 0) -
      (POSITION_DISPLAY_ORDER.get(b.position) ?? 0),
  );

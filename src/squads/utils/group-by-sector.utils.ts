import { PositionCode } from '../../../generated/prisma/client';
import { RosterBySector, RosterPlayer } from '../types';

type SectorPositions = {
  key: keyof RosterBySector;
  positions: PositionCode[];
};

const SECTOR_POSITIONS: SectorPositions[] = [
  { key: 'goalkeepers', positions: ['GOL'] },
  { key: 'defenders', positions: ['ZAG', 'LD', 'LE'] },
  { key: 'midfielders', positions: ['MEI', 'ME', 'MD', 'MC', 'VOL'] },
  { key: 'attackers', positions: ['PD', 'ATA', 'PE'] },
];

export const groupBySector = (players: RosterPlayer[]): RosterBySector => {
  const bySector = {} as RosterBySector;

  for (const { key, positions } of SECTOR_POSITIONS) {
    bySector[key] = players
      .filter((player) => positions.includes(player.position))
      .sort(
        (a, b) =>
          positions.indexOf(a.position) - positions.indexOf(b.position) ||
          Number(b.isStarter) - Number(a.isStarter) ||
          b.overallRating - a.overallRating,
      );
  }

  return bySector;
};

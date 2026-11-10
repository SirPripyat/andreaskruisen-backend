import { PositionCode } from '../../../generated/prisma/client';
import { RosterPlayer } from '../types';

const BENCH_POSITION_POOLS: { positions: PositionCode[]; take: number }[] = [
  { positions: ['GOL'], take: 1 },
  { positions: ['ZAG', 'LD', 'LE'], take: 2 },
  { positions: ['VOL', 'MC', 'MEI'], take: 2 },
  { positions: ['PE', 'ATA', 'PD'], take: 2 },
];

export const limitBench = (bench: RosterPlayer[]): RosterPlayer[] =>
  BENCH_POSITION_POOLS.flatMap(({ positions, take }) =>
    bench
      .filter((player) => positions.includes(player.position))
      .sort((a, b) => b.overallRating - a.overallRating)
      .slice(0, take),
  );

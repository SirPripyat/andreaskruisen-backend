import { PositionCode, PreferredFoot } from '../../generated/prisma/client';
import type { ScraperPlayer } from './scraper-player.schema';

export function mapPreferredFoot(
  raw: ScraperPlayer['preferredFoot'],
): PreferredFoot {
  return raw === 'Destro' ? PreferredFoot.RIGHT : PreferredFoot.LEFT;
}

// O scraper entrega a data no formato "M/D/YYYY H:mm" (ex.: "12/20/1998 0:00").
// Parseado manualmente em UTC para não depender do fuso horário de quem roda o import.
export function parseBirthdate(raw: string): Date {
  const [datePart, timePart] = raw.split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute] = (timePart ?? '0:00').split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

export interface PlayerPositionInput {
  position: PositionCode;
  isPrimary: boolean;
}

export function mapPositions(player: ScraperPlayer): PlayerPositionInput[] {
  return [
    { position: player.positionShort, isPrimary: true },
    ...player.alternatePositions.map((position) => ({
      position,
      isPrimary: false,
    })),
  ];
}

// Única fonte de verdade sobre quais campos compõem um "rating": usada tanto
// para montar a linha a gravar quanto para comparar com a última capturada.
export const RATING_FIELD_NAMES = [
  'overallRating',
  'skillMoves',
  'weakFootAbility',
  'pac',
  'sho',
  'pas',
  'dri',
  'def',
  'phy',
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
  'gkDiving',
  'gkHandling',
  'gkKicking',
  'gkPositioning',
  'gkReflexes',
] as const;

export type NormalizedRating = Record<
  (typeof RATING_FIELD_NAMES)[number],
  number
>;

export function mapRating(player: ScraperPlayer): NormalizedRating {
  return {
    overallRating: player.overallRating,
    skillMoves: player.skillMoves,
    weakFootAbility: player.weakFootAbility,
    ...player.stats,
  };
}

export function ratingsEqual(
  a: NormalizedRating,
  b: NormalizedRating,
): boolean {
  return RATING_FIELD_NAMES.every((field) => a[field] === b[field]);
}

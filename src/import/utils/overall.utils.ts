import { ScraperPlayer } from '../dto';

const OPTIONAL_RATING_FIELD_NAMES = [
  'pac',
  'sho',
  'pas',
  'dri',
  'def',
  'phy',
] as const;

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

type RequiredRatingFieldName = Exclude<
  (typeof RATING_FIELD_NAMES)[number],
  (typeof OPTIONAL_RATING_FIELD_NAMES)[number]
>;

export type NormalizedRating = Record<RequiredRatingFieldName, number> &
  Partial<Record<(typeof OPTIONAL_RATING_FIELD_NAMES)[number], number>>;

export const mapOverall = (player: ScraperPlayer): NormalizedRating => ({
  overallRating: player.overallRating,
  skillMoves: player.skillMoves,
  weakFootAbility: player.weakFootAbility,
  ...player.stats,
});

export const overallsEqual = (
  a: NormalizedRating,
  b: NormalizedRating,
): boolean => RATING_FIELD_NAMES.every((field) => a[field] === b[field]);

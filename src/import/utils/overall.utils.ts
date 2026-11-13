import { ScraperPlayer } from '../dto';
import { computeRatingCategories } from './rating-categories.utils';

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

// pac/sho/pas/dri/def/phy: quando o scraper não manda (ver comentário em
// ScraperStatsSchema), calcula a partir dos atributos detalhados em vez de
// deixar nulo — nunca sobrescreve um valor que o scraper tenha enviado.
export const mapOverall = (player: ScraperPlayer): NormalizedRating => {
  const computed = computeRatingCategories(player.stats);

  return {
    overallRating: player.overallRating,
    skillMoves: player.skillMoves,
    weakFootAbility: player.weakFootAbility,
    ...player.stats,
    pac: player.stats.pac ?? computed.pac,
    sho: player.stats.sho ?? computed.sho,
    pas: player.stats.pas ?? computed.pas,
    dri: player.stats.dri ?? computed.dri,
    def: player.stats.def ?? computed.def,
    phy: player.stats.phy ?? computed.phy,
  };
};

export const overallsEqual = (
  a: NormalizedRating,
  b: NormalizedRating,
): boolean => RATING_FIELD_NAMES.every((field) => a[field] === b[field]);

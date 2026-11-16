import {
  PlayerPositionRatingInput,
  PlayerRatingRoleInput,
} from '../../players/types';
import {
  ScraperPlayer,
  ScraperPlayerPositionRating,
  SofifaPositionCode,
} from '../dto';

export const mapRoles = (player: ScraperPlayer): PlayerRatingRoleInput[] =>
  player.roles.map((role) => ({
    position: role.position,
    name: role.name,
    level: role.level,
  }));

export const mapPositionRatings = (
  player: ScraperPlayer,
): PlayerPositionRatingInput[] =>
  (
    Object.entries(player.positionRatings) as [
      SofifaPositionCode,
      ScraperPlayerPositionRating,
    ][]
  ).map(([position, rating]) => ({ position, ...rating }));

const sortedJoin = <T>(items: T[], toKey: (item: T) => string): string =>
  items.map(toKey).sort().join('|');

export const areSpecialitiesEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length &&
  sortedJoin(a, (name) => name) === sortedJoin(b, (name) => name);

export const areRolesEqual = (
  a: PlayerRatingRoleInput[],
  b: PlayerRatingRoleInput[],
): boolean => {
  const toKey = (role: PlayerRatingRoleInput) =>
    `${role.position}:${role.name}:${role.level}`;

  return a.length === b.length && sortedJoin(a, toKey) === sortedJoin(b, toKey);
};

export const arePositionRatingsEqual = (
  a: PlayerPositionRatingInput[],
  b: PlayerPositionRatingInput[],
): boolean => {
  const toKey = (positionRating: PlayerPositionRatingInput) =>
    `${positionRating.position}:${positionRating.overall}:${positionRating.base}:${positionRating.bonus}:${positionRating.natural}`;

  return a.length === b.length && sortedJoin(a, toKey) === sortedJoin(b, toKey);
};

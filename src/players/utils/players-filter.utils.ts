import { ListPlayersQuery } from '../dto/list-players.schema';
import {
  PlayersFilter,
  SKILL_RATING_FIELDS,
  SkillRatingRanges,
} from '../types';

export const buildPlayersFilter = (query: ListPlayersQuery): PlayersFilter => {
  const skillRatingRanges = SKILL_RATING_FIELDS.reduce<SkillRatingRanges>(
    (ranges, field) => {
      const min = query[`${field}Min` as keyof ListPlayersQuery] as
        | number
        | undefined;
      const max = query[`${field}Max` as keyof ListPlayersQuery] as
        | number
        | undefined;

      if (min !== undefined || max !== undefined) {
        ranges[field] = { min, max };
      }

      return ranges;
    },
    {},
  );

  return {
    name: query.name,
    nationalityIds: query.nationalityIds,
    leagueId: query.leagueId,
    clubId: query.clubId,
    positions: query.positions,
    preferredFoot: query.preferredFoot,
    ageMin: query.ageMin,
    ageMax: query.ageMax,
    overallMin: query.overallMin,
    overallMax: query.overallMax,
    skillRatingRanges: Object.keys(skillRatingRanges).length
      ? skillRatingRanges
      : undefined,
  };
};

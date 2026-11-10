import {
  MatchListItem,
  MatchPlayerOption,
  MatchWithTeams,
  PlayerSummary,
  TeamOwner,
} from '../types';
import { computeMatchScore } from './match-score.utils';

export const toMatchListItem = (
  match: MatchWithTeams,
  locked: boolean,
  ownerByTeamId: Map<string, TeamOwner>,
): MatchListItem => {
  const score = match.playedAt
    ? computeMatchScore(
        match.homeTeam.id,
        match.awayTeam.id,
        match.goalScorerTeamIds,
      )
    : null;

  return {
    id: match.id,
    groupLabel: match.groupLabel,
    round: match.round,
    homeScore: score?.homeGoals ?? null,
    awayScore: score?.awayGoals ?? null,
    penalties: match.penalties,
    homeTeam: {
      ...match.homeTeam,
      owner: ownerByTeamId.get(match.homeTeam.id) ?? null,
    },
    awayTeam: {
      ...match.awayTeam,
      owner: ownerByTeamId.get(match.awayTeam.id) ?? null,
    },
    locked,
  };
};

export const toPlayerOption = (player: PlayerSummary): MatchPlayerOption => ({
  id: player.id,
  name: player.name,
  photoUrl: player.photoUrl,
  position: player.position,
});

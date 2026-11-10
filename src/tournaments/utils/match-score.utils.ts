export const computeMatchScore = (
  homeTeamId: string,
  awayTeamId: string,
  goalScorerTeamIds: string[],
): { homeGoals: number; awayGoals: number } => {
  let homeGoals = 0;
  let awayGoals = 0;

  for (const teamId of goalScorerTeamIds) {
    if (teamId === homeTeamId) homeGoals++;
    else if (teamId === awayTeamId) awayGoals++;
  }

  return { homeGoals, awayGoals };
};

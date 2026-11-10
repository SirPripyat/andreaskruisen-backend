export const countGoalsByTeam = (
  goals: { teamId: string }[],
  homeTeamId: string,
) => {
  let homeGoals = 0;
  let awayGoals = 0;

  for (const goal of goals) {
    if (goal.teamId === homeTeamId) homeGoals++;
    else awayGoals++;
  }

  return { homeGoals, awayGoals };
};

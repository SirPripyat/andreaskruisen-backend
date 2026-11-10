import { GeneratedKnockoutMatch } from '../types';

export const generateKnockoutMatches = (
  teamIds: string[],
): GeneratedKnockoutMatch[] => {
  const matches: GeneratedKnockoutMatch[] = [];

  for (let i = 0; i < teamIds.length; i += 2)
    matches.push({ homeTeamId: teamIds[i], awayTeamId: teamIds[i + 1] });

  return matches;
};

import { shuffle } from './shuffle.utils';

// Sorteia os grupos da fase de grupos (ver GroupStageConfigSchema). Times
// sem dono (CPU, sem Squad na temporada) e times de participantes são
// embaralhados em separado e depois intercalados conforme
// keepOwnedTeamsInSameGroup:
// - true: enche os grupos em sequência começando pelos times de
//   participantes, concentrando-os no(s) primeiro(s) grupo(s) (só "vaza"
//   pro grupo seguinte se não couberem todos num grupo só).
// - false: distribui os times de participantes um por grupo, round-robin,
//   antes de completar cada grupo com times CPU — maximiza a mistura.
export const drawGroupStageGroups = (
  teamIds: string[],
  ownedTeamIds: ReadonlySet<string>,
  groupSize: number,
  keepOwnedTeamsInSameGroup: boolean,
): string[][] => {
  const groupsCount = teamIds.length / groupSize;
  const groups: string[][] = Array.from({ length: groupsCount }, () => []);

  const owned = shuffle(teamIds.filter((teamId) => ownedTeamIds.has(teamId)));
  const unowned = shuffle(
    teamIds.filter((teamId) => !ownedTeamIds.has(teamId)),
  );

  const nextOpenGroup = (): string[] | undefined =>
    groups.find((group) => group.length < groupSize);

  if (keepOwnedTeamsInSameGroup) {
    for (const teamId of [...owned, ...unowned]) nextOpenGroup()?.push(teamId);
    return groups;
  }

  owned.forEach((teamId, index) => {
    groups[index % groupsCount].push(teamId);
  });
  for (const teamId of unowned) nextOpenGroup()?.push(teamId);

  return groups;
};

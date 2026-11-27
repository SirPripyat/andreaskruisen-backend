import { drawGroupStageGroups } from '../group-stage-draw.utils';

const allTeams = Array.from({ length: 8 }, (_, i) => `t${i}`);

describe('drawGroupStageGroups', () => {
  it('monta o número certo de grupos, cada um com groupSize times, sem repetir nem perder nenhum', () => {
    const groups = drawGroupStageGroups(allTeams, new Set(), 4, false);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.length === 4)).toBe(true);
    expect(new Set(groups.flat())).toEqual(new Set(allTeams));
  });

  describe('keepOwnedTeamsInSameGroup = true', () => {
    it('concentra os times de participantes no(s) primeiro(s) grupo(s)', () => {
      const ownedTeamIds = new Set(['t0', 't1', 't2']);
      const groups = drawGroupStageGroups(allTeams, ownedTeamIds, 4, true);

      const ownedByGroup = groups.map(
        (group) => group.filter((teamId) => ownedTeamIds.has(teamId)).length,
      );

      // os 3 times de participantes cabem todos no primeiro grupo (tamanho 4).
      expect(ownedByGroup).toEqual([3, 0]);
    });

    it('quando não cabem num grupo só, preenche o próximo em sequência', () => {
      const ownedTeamIds = new Set(['t0', 't1', 't2', 't3', 't4']);
      const groups = drawGroupStageGroups(allTeams, ownedTeamIds, 4, true);

      const ownedByGroup = groups.map(
        (group) => group.filter((teamId) => ownedTeamIds.has(teamId)).length,
      );

      expect(ownedByGroup).toEqual([4, 1]);
    });
  });

  describe('keepOwnedTeamsInSameGroup = false', () => {
    it('distribui os times de participantes um por grupo, round-robin', () => {
      const ownedTeamIds = new Set(['t0', 't1']);
      const groups = drawGroupStageGroups(allTeams, ownedTeamIds, 4, false);

      const ownedByGroup = groups.map(
        (group) => group.filter((teamId) => ownedTeamIds.has(teamId)).length,
      );

      expect(ownedByGroup).toEqual([1, 1]);
    });
  });
});

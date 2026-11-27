import { buildGroupStageQualifiersBracket } from '../group-stage-knockout-draw.utils';
import { GroupStanding } from '../group-standings.utils';

const standingAt = (teamId: string, position: number): GroupStanding =>
  ({ teamId, position }) as GroupStanding;

describe('buildGroupStageQualifiersBracket', () => {
  it('monta groupLabels.length * qualifiersPerGroup / 2 confrontos', () => {
    const standingsByGroup = {
      A: [standingAt('A1', 1), standingAt('A2', 2)],
      B: [standingAt('B1', 1), standingAt('B2', 2)],
      C: [standingAt('C1', 1), standingAt('C2', 2)],
      D: [standingAt('D1', 1), standingAt('D2', 2)],
    };

    const matches = buildGroupStageQualifiersBracket(
      ['A', 'B', 'C', 'D'],
      standingsByGroup,
      2,
    );

    expect(matches).toHaveLength(4);

    const teamsInBracket = matches.flatMap((match) => [
      match.homeTeamId,
      match.awayTeamId,
    ]);
    expect(new Set(teamsInBracket)).toEqual(
      new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2']),
    );
  });

  it('nunca pareia dois times do mesmo grupo entre si', () => {
    const groupOfTeam: Record<string, string> = {};
    const standingsByGroup: Record<string, GroupStanding[]> = {};

    for (const label of ['A', 'B', 'C', 'D']) {
      standingsByGroup[label] = [1, 2].map((position) => {
        const teamId = `${label}${position}`;
        groupOfTeam[teamId] = label;
        return standingAt(teamId, position);
      });
    }

    const matches = buildGroupStageQualifiersBracket(
      ['A', 'B', 'C', 'D'],
      standingsByGroup,
      2,
    );

    for (const match of matches) {
      expect(groupOfTeam[match.homeTeamId]).not.toBe(
        groupOfTeam[match.awayTeamId],
      );
    }
  });

  it('funciona com qualifiersPerGroup > 2', () => {
    const groupOfTeam: Record<string, string> = {};
    const standingsByGroup: Record<string, GroupStanding[]> = {};

    for (const label of ['A', 'B']) {
      standingsByGroup[label] = [1, 2, 3, 4].map((position) => {
        const teamId = `${label}${position}`;
        groupOfTeam[teamId] = label;
        return standingAt(teamId, position);
      });
    }

    const matches = buildGroupStageQualifiersBracket(
      ['A', 'B'],
      standingsByGroup,
      4,
    );

    expect(matches).toHaveLength(4);

    for (const match of matches) {
      expect(groupOfTeam[match.homeTeamId]).not.toBe(
        groupOfTeam[match.awayTeamId],
      );
    }
  });
});

import { GroupStageConfigSchema } from '../group-stage-config.schema';

describe('GroupStageConfigSchema', () => {
  it('aceita uma configuração válida', () => {
    const result = GroupStageConfigSchema.safeParse({
      groupSize: 4,
      qualifiersPerGroup: 2,
      doubleRound: false,
      keepOwnedTeamsInSameGroup: true,
    });

    expect(result.success).toBe(true);
  });

  it('rejeita qualifiersPerGroup maior que groupSize', () => {
    const result = GroupStageConfigSchema.safeParse({
      groupSize: 4,
      qualifiersPerGroup: 5,
      doubleRound: false,
      keepOwnedTeamsInSameGroup: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejeita groupSize menor que 2', () => {
    const result = GroupStageConfigSchema.safeParse({
      groupSize: 1,
      qualifiersPerGroup: 1,
      doubleRound: false,
      keepOwnedTeamsInSameGroup: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejeita qualifiersPerGroup menor que 1', () => {
    const result = GroupStageConfigSchema.safeParse({
      groupSize: 4,
      qualifiersPerGroup: 0,
      doubleRound: false,
      keepOwnedTeamsInSameGroup: true,
    });

    expect(result.success).toBe(false);
  });
});

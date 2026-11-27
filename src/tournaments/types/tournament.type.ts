export type GeneratedGroupMatch = {
  groupLabel: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
};

export type GeneratedKnockoutMatch = {
  homeTeamId: string;
  // null = bye (ver buildGroupStageQualifiersBracket) — o time da casa
  // avança sem jogar.
  awayTeamId: string | null;
};

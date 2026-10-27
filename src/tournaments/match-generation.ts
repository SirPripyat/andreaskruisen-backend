export interface GeneratedGroupMatch {
  groupLabel: string;
  // Rodada do turno único dentro do grupo (1 a 3) — cada time joga uma vez
  // por rodada. Ver GROUP_ROUND_PAIRINGS.
  round: number;
  homeTeamId: string;
  awayTeamId: string;
}

export interface GeneratedKnockoutMatch {
  homeTeamId: string;
  awayTeamId: string;
}

const GROUP_SIZE = 4;

// Turno único pra 4 times (método do círculo, com o time 0 fixo): cada
// time joga exatamente uma vez por rodada e todo par se enfrenta uma vez
// ao fim das 3 rodadas. Índices são posições dentro do grupo (0 a 3).
const GROUP_ROUND_PAIRINGS: [number, number][][] = [
  [
    [0, 3],
    [1, 2],
  ],
  [
    [0, 2],
    [3, 1],
  ],
  [
    [0, 1],
    [2, 3],
  ],
];

// Times já devem vir embaralhados pra quem chama; aqui a montagem de
// grupos/confrontos é determinística, pra ficar fácil de testar.
export function generateGroupStageMatches(
  teamIds: string[],
): GeneratedGroupMatch[] {
  const matches: GeneratedGroupMatch[] = [];

  for (let i = 0; i < teamIds.length; i += GROUP_SIZE) {
    const group = teamIds.slice(i, i + GROUP_SIZE);
    const groupLabel = groupLabelForIndex(i / GROUP_SIZE);

    GROUP_ROUND_PAIRINGS.forEach((pairings, roundIndex) => {
      for (const [home, away] of pairings) {
        matches.push({
          groupLabel,
          round: roundIndex + 1,
          homeTeamId: group[home],
          awayTeamId: group[away],
        });
      }
    });
  }

  return matches;
}

export function generateKnockoutMatches(
  teamIds: string[],
): GeneratedKnockoutMatch[] {
  const matches: GeneratedKnockoutMatch[] = [];

  for (let i = 0; i < teamIds.length; i += 2) {
    matches.push({ homeTeamId: teamIds[i], awayTeamId: teamIds[i + 1] });
  }

  return matches;
}

// Só as últimas 4 rodadas de mata-mata têm nome próprio; o resto é numerado
// pela posição da fase no torneio (`order`): "1ª rodada", "2ª rodada"...
const KNOCKOUT_ROUND_NAMES: Record<number, string> = {
  2: 'Final',
  4: 'Semifinal',
  8: 'Quartas de final',
  16: 'Oitavas de final',
};

export function knockoutRoundName(teamsCount: number, order: number): string {
  return KNOCKOUT_ROUND_NAMES[teamsCount] ?? `${order}ª rodada`;
}

function groupLabelForIndex(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

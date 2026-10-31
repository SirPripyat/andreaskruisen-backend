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

// Turno único pelo método do círculo, com o time 0 fixo: cada time joga
// exatamente uma vez por rodada e todo par se enfrenta uma vez ao fim de
// N-1 rodadas. Índices são posições dentro da lista recebida (0 a N-1); N
// precisa ser par.
function roundRobinPairings(teamsCount: number): [number, number][][] {
  const positions = Array.from({ length: teamsCount }, (_, i) => i);
  const half = teamsCount / 2;
  const rounds: [number, number][][] = [];

  for (let round = 0; round < teamsCount - 1; round++) {
    const pairings: [number, number][] = [];
    for (let i = 0; i < half; i++) {
      pairings.push([positions[i], positions[teamsCount - 1 - i]]);
    }
    rounds.push(pairings);

    // Rotaciona mantendo positions[0] fixo, pra montar a rodada seguinte.
    const last = positions[teamsCount - 1];
    for (let i = teamsCount - 1; i > 1; i--) {
      positions[i] = positions[i - 1];
    }
    positions[1] = last;
  }

  return rounds;
}

function roundRobinMatches(
  teamIds: string[],
  groupLabel: string,
): GeneratedGroupMatch[] {
  const matches: GeneratedGroupMatch[] = [];

  roundRobinPairings(teamIds.length).forEach((pairings, roundIndex) => {
    for (const [home, away] of pairings) {
      matches.push({
        groupLabel,
        round: roundIndex + 1,
        homeTeamId: teamIds[home],
        awayTeamId: teamIds[away],
      });
    }
  });

  return matches;
}

// Liga: turno único com todos os times numa tabela só (ver LEAGUE em
// tournament-format-rules.ts) — por isso um único groupLabel.
// Times já devem vir embaralhados pra quem chama; aqui a montagem dos
// confrontos é determinística, pra ficar fácil de testar.
export function generateLeagueMatches(teamIds: string[]): GeneratedGroupMatch[] {
  return roundRobinMatches(teamIds, 'A');
}

// Fase de grupos do GROUP_STAGE_KNOCKOUT: turno único dentro de cada grupo
// de 4 times, rotulados A, B, C... Times já devem vir embaralhados pra quem
// chama; aqui a montagem de grupos/confrontos é determinística, pra ficar
// fácil de testar.
export function generateGroupStageMatches(
  teamIds: string[],
): GeneratedGroupMatch[] {
  const matches: GeneratedGroupMatch[] = [];

  for (let i = 0; i < teamIds.length; i += GROUP_SIZE) {
    const group = teamIds.slice(i, i + GROUP_SIZE);
    const groupLabel = groupLabelForIndex(i / GROUP_SIZE);
    matches.push(...roundRobinMatches(group, groupLabel));
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

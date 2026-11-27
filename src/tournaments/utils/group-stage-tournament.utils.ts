import { GeneratedGroupMatch } from '../types';

const groupLabelForIndex = (index: number): string =>
  String.fromCharCode('A'.charCodeAt(0) + index);

// Método do círculo: times com rotação cíclica das posições, casa/fora
// definidos por posição no slot. Grupo de tamanho ímpar ganha um slot de
// "bye" (BYE) a mais — fica par internamente (slotCount sempre par) e o
// time que cai no bye numa rodada simplesmente não joga nela; sem isso,
// metade do grupo (`teamsCount / 2`, não inteiro) faz `i < half` sobrar uma
// posição e um time acaba pareado com ele mesmo.
const BYE = -1;

const roundRobinPairings = (teamsCount: number): [number, number][][] => {
  const hasBye = teamsCount % 2 !== 0;
  const slotCount = hasBye ? teamsCount + 1 : teamsCount;
  const positions = Array.from({ length: slotCount }, (_, i) =>
    hasBye && i === slotCount - 1 ? BYE : i,
  );
  const half = slotCount / 2;
  const rounds: [number, number][][] = [];

  for (let round = 0; round < slotCount - 1; round++) {
    const pairings: [number, number][] = [];

    for (let i = 0; i < half; i++) {
      const home = positions[i];
      const away = positions[slotCount - 1 - i];
      if (home !== BYE && away !== BYE) pairings.push([home, away]);
    }

    rounds.push(pairings);

    const last = positions[slotCount - 1];

    for (let i = slotCount - 1; i > 1; i--) positions[i] = positions[i - 1];

    positions[1] = last;
  }

  return rounds;
};

// Turno único de um grupo. Ida e volta (ver generateGroupStageMatches) é o
// mesmo turno repetido com casa/fora invertido, na rodada equivalente da
// segunda metade do campeonato (round + firstLegRounds) — não uma segunda
// chamada a roundRobinPairings, pra manter os dois turnos com os mesmos
// confrontos e só o lado de casa trocado.
const roundRobinMatches = (
  teamIds: string[],
  groupLabel: string,
  doubleRound: boolean,
): GeneratedGroupMatch[] => {
  const matches: GeneratedGroupMatch[] = [];
  const rounds = roundRobinPairings(teamIds.length);
  const firstLegRounds = rounds.length;

  rounds.forEach((pairings, roundIndex) => {
    for (const [home, away] of pairings) {
      matches.push({
        groupLabel,
        round: roundIndex + 1,
        homeTeamId: teamIds[home],
        awayTeamId: teamIds[away],
      });

      if (doubleRound)
        matches.push({
          groupLabel,
          round: roundIndex + 1 + firstLegRounds,
          homeTeamId: teamIds[away],
          awayTeamId: teamIds[home],
        });
    }
  });

  return matches;
};

export const generateGroupStageMatches = (
  groups: string[][],
  doubleRound = false,
): GeneratedGroupMatch[] =>
  groups.flatMap((group, index) =>
    roundRobinMatches(group, groupLabelForIndex(index), doubleRound),
  );

import { GeneratedKnockoutMatch } from '../types';
import { GroupStanding } from './group-standings.utils';
import { nextPowerOfTwo } from './tournament-format-rules.utils';

// Pareia sequencialmente uma lista de seeds já ordenada, trocando o próximo
// candidato da fila sempre que ele for do mesmo grupo do time que acabou de
// entrar no confronto — evita ao máximo que dois times do mesmo grupo se
// enfrentem já na 1ª rodada.
const pairAvoidingSameGroup = (
  seeds: string[],
  groupOfTeam: Map<string, string>,
): GeneratedKnockoutMatch[] => {
  const remaining = [...seeds];
  const matches: GeneratedKnockoutMatch[] = [];

  while (remaining.length > 0) {
    const homeTeamId = remaining.shift() as string;
    const homeGroup = groupOfTeam.get(homeTeamId);

    const otherGroupIndex = remaining.findIndex(
      (teamId) => groupOfTeam.get(teamId) !== homeGroup,
    );
    const awayIndex = otherGroupIndex === -1 ? 0 : otherGroupIndex;
    const [awayTeamId] = remaining.splice(awayIndex, 1);

    matches.push({ homeTeamId, awayTeamId });
  }

  return matches;
};

// Monta o mata-mata que decide quem sai da fase de grupos (ver
// AdvancePhaseUseCase). Ordena os classificados por posição (todos os 1º
// colocados, depois todos os 2º colocados, etc.), rotacionando a ordem dos
// grupos a cada posição pra não repetir sempre a mesma vizinhança — ver
// pairAvoidingSameGroup pro pareamento em si.
//
// Quando o total de classificados não é potência de 2, os melhores seeds
// (os primeiros da lista ordenada) recebem bye — avançam direto sem jogar —
// até completar o bracket na próxima potência de 2 (ver nextPowerOfTwo). Os
// slots de bye são intercalados um por par de "irmãos" (slot 2k antes de
// 2k+1) sempre que possível, pra dois byes não caírem direto um contra o
// outro já na rodada seguinte.
export const buildGroupStageQualifiersBracket = (
  groupLabels: string[],
  standingsByGroup: Record<string, GroupStanding[]>,
  qualifiersPerGroup: number,
): GeneratedKnockoutMatch[] => {
  const groupOfTeam = new Map<string, string>();
  const seeds: string[] = [];

  for (let position = 0; position < qualifiersPerGroup; position++) {
    const rotation = position % groupLabels.length;
    const rotatedLabels = [
      ...groupLabels.slice(rotation),
      ...groupLabels.slice(0, rotation),
    ];

    for (const label of rotatedLabels) {
      const teamId = standingsByGroup[label][position].teamId;
      seeds.push(teamId);
      groupOfTeam.set(teamId, label);
    }
  }

  const bracketSize = nextPowerOfTwo(seeds.length);
  const byeCount = bracketSize - seeds.length;

  if (byeCount === 0) return pairAvoidingSameGroup(seeds, groupOfTeam);

  const byeTeamIds = seeds.slice(0, byeCount);
  const pairPool = seeds.slice(byeCount);
  const realMatches = pairAvoidingSameGroup(pairPool, groupOfTeam);

  const slotCount = bracketSize / 2;
  const numPairs = Math.floor(slotCount / 2);
  const slotIsBye = new Array<boolean>(slotCount).fill(false);
  let assigned = 0;

  for (let pair = 0; pair < numPairs && assigned < byeCount; pair++) {
    slotIsBye[2 * pair] = true;
    assigned++;
  }
  for (let slot = 1; slot < slotCount && assigned < byeCount; slot += 2) {
    if (!slotIsBye[slot]) {
      slotIsBye[slot] = true;
      assigned++;
    }
  }

  const byeQueue = [...byeTeamIds];
  const matchQueue = [...realMatches];

  return slotIsBye.map((isBye) =>
    isBye
      ? { homeTeamId: byeQueue.shift() as string, awayTeamId: null }
      : (matchQueue.shift() as GeneratedKnockoutMatch),
  );
};

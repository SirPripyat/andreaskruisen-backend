import { PositionCode } from '../../../generated/prisma/client';
import { POSITION_DISPLAY_ORDER } from './sort-by-position.utils';

export type LineupSlot = {
  playerId: string;
  position: PositionCode;
};

// Troca de formação não deve embaralhar o time: quem já ocupa uma posição
// que continua existindo no novo layout permanece nela (ver regra 2 da
// feature de escalação — a posição pertence ao SLOT, não ao jogador). Só
// quem sobra (a posição dele não existe mais no novo layout, ou já foi
// ocupada por outro titular) é redistribuído pelos slots que restarem, na
// ordem GOL→ATA; o técnico ajusta manualmente depois via troca de posição
// se o resultado não for o desejado.
export const remapLineupPositions = (
  starters: LineupSlot[],
  template: PositionCode[],
): LineupSlot[] => {
  const remainingSlots = [...template];
  const matched: LineupSlot[] = [];
  const unmatched: LineupSlot[] = [];

  for (const starter of starters) {
    const slotIndex = remainingSlots.indexOf(starter.position);

    if (slotIndex === -1) {
      unmatched.push(starter);
      continue;
    }

    remainingSlots.splice(slotIndex, 1);
    matched.push(starter);
  }

  remainingSlots.sort(
    (a, b) =>
      (POSITION_DISPLAY_ORDER.get(a) ?? 0) -
      (POSITION_DISPLAY_ORDER.get(b) ?? 0),
  );

  const reassigned = unmatched.map((starter, index) => ({
    playerId: starter.playerId,
    position: remainingSlots[index],
  }));

  return [...matched, ...reassigned];
};

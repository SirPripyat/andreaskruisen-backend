import { PositionCode } from 'generated/prisma/client';

// Grupo tático usado pra restringir a comparação de similaridade: só faz
// sentido comparar atributos dentro da mesma linha (goleiro nunca com linha).
export const POSITION_GROUPS = {
  GOALKEEPER: ['GOL'],
  DEFENSE: ['ZAG', 'LD', 'LE'],
  MIDFIELD: ['VOL', 'MC', 'MD', 'ME', 'MEI'],
  ATTACK: ['PD', 'PE', 'ATA'],
} as const satisfies Record<string, readonly PositionCode[]>;

export type PositionGroup = keyof typeof POSITION_GROUPS;

export const getPositionGroup = (position: PositionCode): PositionGroup => {
  const group = (Object.keys(POSITION_GROUPS) as PositionGroup[]).find((key) =>
    (POSITION_GROUPS[key] as readonly PositionCode[]).includes(position),
  );

  if (!group) {
    throw new Error(`Posição sem grupo de similaridade definido: ${position}`);
  }

  return group;
};

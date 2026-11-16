import { z } from 'zod';
import { PositionCode } from '../../../../generated/prisma/client';

// Promove/rebaixa um único jogador sem exigir um par pra trocar — ver
// SetLineupStarterUseCase, usado quando o elenco tem menos de 11 jogadores.
// `position` é o slot exato da formação pra onde o jogador foi arrastado no
// campo (drag-and-drop no front) — só faz sentido com isStarter: true; se
// omitido, cai na posição primária do jogador (ver SetLineupStarterUseCase).
export const SetLineupStarterSchema = z.object({
  isStarter: z.boolean(),
  position: z.nativeEnum(PositionCode).optional(),
});

export type SetLineupStarterRequestDTO = z.infer<typeof SetLineupStarterSchema>;

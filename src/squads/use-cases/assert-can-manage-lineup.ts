import { ForbiddenException } from '@nestjs/common';
import { Squad } from '../../../generated/prisma/client';
import { AuthenticatedUser } from '../../auth/auth.service';

// ADMIN mexe na escalação de qualquer time; o técnico (dono do Squad nessa
// temporada) só mexe na escalação do seu próprio time (regra 1 da feature
// de escalação). Usado por SwapLineupStarterUseCase e
// ChangeSquadFormationUseCase.
export const assertCanManageLineup = (
  squad: Pick<Squad, 'userId'>,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): void => {
  if (user.role === 'ADMIN') return;
  if (squad.userId === user.id) return;

  throw new ForbiddenException('Esse time não é seu nessa temporada');
};

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Squad } from '../../../generated/prisma/client';
import { AuthenticatedUser } from '../../auth/auth.service';

// ADMIN mexe na escalação de qualquer time, mesmo um que ainda não tem
// Squad nessa temporada (time que nenhum participante escolheu — ver
// ChooseSquadUseCase); o técnico (dono do Squad) só mexe na escalação do
// seu próprio time, e precisa que o Squad já exista. Usado por
// SwapLineupStarterUseCase, SetLineupStarterUseCase e
// ChangeSquadFormationUseCase.
export const assertCanManageLineup = (
  squad: Pick<Squad, 'userId'> | null,
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
): void => {
  if (user.role === 'ADMIN') return;

  if (!squad)
    throw new NotFoundException('Esse time não tem elenco nessa temporada');

  if (squad.userId === user.id) return;

  throw new ForbiddenException('Esse time não é seu nessa temporada');
};

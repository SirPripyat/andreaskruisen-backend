import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/types';
import { SeasonsRepository } from '../seasons.repository';

// Resolve a temporada "efetiva" de um usuário: a que ele escolheu
// pessoalmente (User.selectedSeasonId) ou, na falta dela, o default
// global (Season.isActive). Usado por SeasonContextGuard pra tirar o
// seasonId da URL nos endpoints de squads/tournaments/transfers. Retorna
// null quando não há nem seleção pessoal nem temporada ativa — sinal pro
// front-end mostrar a tela de seleção de temporada, não um erro.
//
// Fica fora da Facade de propósito: não é um endpoint, é infra consumida
// direto pelo guard (igual ValidateSessionUseCase pro SessionAuthGuard).
@Injectable()
export class GetEffectiveSeasonIdUseCase {
  constructor(private readonly seasonsRepository: SeasonsRepository) {}

  async execute(
    user: Pick<AuthenticatedUser, 'selectedSeasonId'>,
  ): Promise<string | null> {
    if (user.selectedSeasonId) {
      return user.selectedSeasonId;
    }

    const active = await this.seasonsRepository.findActive();
    return active?.id ?? null;
  }
}

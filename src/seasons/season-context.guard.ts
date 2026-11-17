import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/session-auth.guard';
import { GetEffectiveSeasonIdUseCase } from './use-cases';

// Usado pelo /me, que precisa tolerar null pra sinalizar ao front-end que a
// tela de seleção de temporada deve aparecer.
export type SeasonScopedRequest = AuthenticatedRequest & {
  seasonId: string | null;
};

// Usado pelos demais endpoints (squads, transfers, tournaments, players,
// teams, favorites): o front-end só os chama depois de já ter visto um
// seasonId em /me, então aqui ele é tratado como garantido.
export type RequiredSeasonScopedRequest = AuthenticatedRequest & {
  seasonId: string;
};

@Injectable()
export class SeasonContextGuard implements CanActivate {
  constructor(
    private readonly getEffectiveSeasonIdUseCase: GetEffectiveSeasonIdUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SeasonScopedRequest>();
    request.seasonId = await this.getEffectiveSeasonIdUseCase.execute(
      request.user,
    );
    return true;
  }
}

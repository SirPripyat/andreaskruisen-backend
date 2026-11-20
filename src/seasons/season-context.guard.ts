import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

// Tolera seasonId null: só o /me usa, pra poder mandar o front-end pra tela
// de seleção de temporada em vez de dar erro.
@Injectable()
export class OptionalSeasonContextGuard implements CanActivate {
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

// Exige seasonId resolvido: usado por todo o resto (squads, transfers,
// tournaments, notifications, players, teams, favorites, negotiations...).
// Rejeita a requisição em vez de deixar passar com seasonId null, porque o
// contrato "front-end só chama depois de ver seasonId em /me" não é
// garantido em runtime.
@Injectable()
export class SeasonContextGuard implements CanActivate {
  constructor(
    private readonly getEffectiveSeasonIdUseCase: GetEffectiveSeasonIdUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequiredSeasonScopedRequest>();
    const seasonId = await this.getEffectiveSeasonIdUseCase.execute(
      request.user,
    );

    if (!seasonId) throw new NotFoundException('Temporada não encontrada');

    request.seasonId = seasonId;
    return true;
  }
}

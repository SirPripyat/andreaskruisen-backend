import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/session-auth.guard';
import { SeasonsService } from './seasons.service';

export type SeasonScopedRequest = AuthenticatedRequest & {
  seasonId: string;
};

@Injectable()
export class SeasonContextGuard implements CanActivate {
  constructor(private readonly seasonsService: SeasonsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SeasonScopedRequest>();
    request.seasonId = await this.seasonsService.getEffectiveSeasonId(
      request.user,
    );
    return true;
  }
}

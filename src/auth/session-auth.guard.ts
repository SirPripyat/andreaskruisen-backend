import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser, AuthService } from './auth.service';

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  token: string;
};

const BEARER_PREFIX = 'Bearer ';

const extractBearerToken = (
  authorizationHeader?: string,
): string | undefined => {
  if (!authorizationHeader?.startsWith(BEARER_PREFIX)) {
    return undefined;
  }

  return authorizationHeader.slice(BEARER_PREFIX.length);
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Sessão não encontrada');
    }

    request.user = await this.authService.validateSession(token);
    request.token = token;
    return true;
  }
}

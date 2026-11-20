import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { AuthenticatedRequest } from './session-auth.guard';

// Use sempre depois de SessionAuthGuard (@UseGuards(SessionAuthGuard, RolesGuard)),
// combinado com @Roles(...) na classe ou no método. Sem @Roles(), deixa passar
// qualquer usuário autenticado.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!requiredRoles.includes(request.user.role))
      throw new ForbiddenException(
        'Apenas administradores podem acessar este recurso',
      );

    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './session-auth.guard';

// Depende do SessionAuthGuard já ter rodado e preenchido request.user
// (use sempre @UseGuards(SessionAuthGuard, AdminGuard), nessa ordem).
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem acessar este recurso',
      );
    }

    return true;
  }
}

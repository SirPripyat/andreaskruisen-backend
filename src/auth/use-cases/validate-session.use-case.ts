import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionsRepository } from '../sessions.repository';
import { AuthenticatedUser } from '../types';

// Fica fora da Facade de propósito: não é um endpoint, é infra consumida
// direto por SessionAuthGuard (igual GetEffectiveSeasonIdUseCase pro
// SeasonContextGuard) — todo endpoint protegido do app passa por aqui.
@Injectable()
export class ValidateSessionUseCase {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async execute(token: string): Promise<AuthenticatedUser> {
    const session = await this.sessionsRepository.findValidByToken(token);

    if (!session)
      throw new UnauthorizedException('Sessão inválida ou expirada');

    return session.user;
  }
}

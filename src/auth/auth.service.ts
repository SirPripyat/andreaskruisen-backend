import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { UserRole } from '../../generated/prisma/client';
import { UsersRepository } from '../users/users.repository';
import { Login } from './dto/login.schema';
import { SessionsRepository } from './sessions.repository';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async login(
    dto: Login,
  ): Promise<{ user: AuthenticatedUser; token: string; expiresAt: Date }> {
    const user = await this.usersRepository.findByName(dto.name);

    // Mesma mensagem para usuário inexistente ou PIN errado, pra não revelar
    // quais nomes estão cadastrados.
    if (!user || !(await compare(dto.pin, user.pinHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.sessionsRepository.create({ token, userId: user.id, expiresAt });

    return {
      user: { id: user.id, name: user.name, role: user.role },
      token,
      expiresAt,
    };
  }

  async logout(token: string): Promise<void> {
    await this.sessionsRepository.deleteByToken(token);
  }

  async validateSession(token: string): Promise<AuthenticatedUser> {
    const session = await this.sessionsRepository.findValidByToken(token);

    if (!session) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    return session.user;
  }
}

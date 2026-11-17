import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { UsersRepository } from '../../users/users.repository';
import { LoginRequestDTO } from '../dto/request';
import { SessionsRepository } from '../sessions.repository';
import { AuthenticatedUser } from '../types';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async execute(
    dto: LoginRequestDTO,
  ): Promise<{ user: AuthenticatedUser; token: string; expiresAt: Date }> {
    const user = await this.usersRepository.findByName(dto.name);

    if (!user || !(await compare(dto.pin, user.pinHash)))
      throw new UnauthorizedException('Credenciais inválidas');

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.sessionsRepository.create({ token, userId: user.id, expiresAt });

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        selectedSeasonId: user.selectedSeasonId,
      },
      token,
      expiresAt,
    };
  }
}

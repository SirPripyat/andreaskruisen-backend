import { Injectable } from '@nestjs/common';
import { SessionsRepository } from '../sessions.repository';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async execute(token: string): Promise<void> {
    await this.sessionsRepository.deleteByToken(token);
  }
}

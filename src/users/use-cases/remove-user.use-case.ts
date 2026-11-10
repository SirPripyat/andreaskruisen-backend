import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma } from '../../../generated/prisma/client';
import { UsersRepository } from '../users.repository';

const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class RemoveUserUseCase {
  constructor(private readonly repository: UsersRepository) {}

  @Transactional()
  async execute(id: string, requestingUserId: string): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (id === requestingUserId) {
      throw new ConflictException(
        'Você não pode excluir o próprio usuário logado',
      );
    }

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new ConflictException(
          'Usuário tem elenco ou transferências vinculadas e não pode ser excluído',
        );
      }
      throw error;
    }
  }
}

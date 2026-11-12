import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { UpdateLeagueRequestDTO, UpdateLeagueResponseDTO } from '../dto';
import { LeaguesRepository } from '../leagues.repository';
import { FindLeagueUseCase } from './find-league.use-case';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class UpdateLeagueUseCase {
  constructor(
    private readonly repository: LeaguesRepository,
    private readonly findLeagueUseCase: FindLeagueUseCase,
  ) {}

  async execute(
    id: string,
    dto: UpdateLeagueRequestDTO,
  ): Promise<UpdateLeagueResponseDTO> {
    await this.findLeagueUseCase.execute(id);

    return this.repository
      .update(id, dto)
      .then((league) => league)
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === UNIQUE_CONSTRAINT_VIOLATION)
            throw new ConflictException('Já existe uma liga com esse nome');
          if (error.code === FOREIGN_KEY_VIOLATION)
            throw new BadRequestException('País não encontrado');
        }

        throw error;
      });
  }
}

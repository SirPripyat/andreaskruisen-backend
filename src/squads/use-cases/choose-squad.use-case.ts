import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { ChooseSquadRequestDTO, ChooseSquadResponseDTO } from '../dto';
import { SquadsRepository } from '../squads.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class ChooseSquadUseCase {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  async execute(
    userId: string,
    seasonId: string,
    dto: ChooseSquadRequestDTO,
  ): Promise<ChooseSquadResponseDTO> {
    const season = await this.seasonsRepository.findById(seasonId);

    if (!season) throw new NotFoundException('Temporada não encontrada');

    const existing = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (existing)
      throw new ConflictException('Você já escolheu um time nessa temporada');

    return this.createSquad(seasonId, userId, dto.teamId);
  }

  private async createSquad(
    seasonId: string,
    userId: string,
    teamId: string,
  ): Promise<ChooseSquadResponseDTO> {
    return this.squadsRepository
      .create({ seasonId, userId, teamId })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === UNIQUE_CONSTRAINT_VIOLATION)
            throw new ConflictException(
              'Esse time já foi escolhido por outro participante nessa temporada',
            );

          if (error.code === FOREIGN_KEY_VIOLATION)
            throw new BadRequestException('Time não encontrado');
        }

        throw error;
      });
  }
}

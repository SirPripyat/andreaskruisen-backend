import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { AssignSquadRequestDTO, AssignSquadResponseDTO } from '../dto';
import { SquadsRepository } from '../squads.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class AssignSquadUseCase {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  async execute(
    seasonId: string,
    dto: AssignSquadRequestDTO,
  ): Promise<AssignSquadResponseDTO> {
    const season = await this.seasonsRepository.findById(seasonId);

    if (!season) throw new NotFoundException('Temporada não encontrada');

    const [existingForUser, existingForTeam] = await Promise.all([
      this.squadsRepository.findByUserAndSeason(dto.userId, seasonId),
      this.squadsRepository.findByTeamAndSeason(dto.teamId, seasonId),
    ]);

    if (existingForUser)
      throw new ConflictException(
        'Esse usuário já comanda um time nessa temporada',
      );

    if (existingForTeam)
      throw new ConflictException('Esse time já tem dono nessa temporada');

    return this.assignSquad(season.id, dto);
  }

  private async assignSquad(seasonId: string, dto: AssignSquadRequestDTO) {
    return await this.squadsRepository
      .create({
        seasonId,
        userId: dto.userId,
        teamId: dto.teamId,
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
            throw new ConflictException(
              'Esse usuário ou esse time já têm vínculo nessa temporada',
            );
          }
          if (error.code === FOREIGN_KEY_VIOLATION) {
            throw new BadRequestException('Usuário ou time não encontrado');
          }
        }
        throw error;
      });
  }
}

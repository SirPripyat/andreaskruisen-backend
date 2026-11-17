import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { FORMATION_DISPLAY_TO_ENUM } from '../../import/utils/formation-mapper.utils';
import { UpdateTeamRequestDTO } from '../dto/request';
import { UpdateTeamResponseDTO } from '../dto/response';
import { TeamsRepository } from '../teams.repository';
import { UpdateTeamData } from '../types';
import { FindTeamOrThrowUseCase } from './find-team-or-throw.use-case';
import { GetTeamUseCase } from './get-team.use-case';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class UpdateTeamUseCase {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly findTeamOrThrowUseCase: FindTeamOrThrowUseCase,
    private readonly getTeamUseCase: GetTeamUseCase,
  ) {}

  async execute(
    id: string,
    dto: UpdateTeamRequestDTO,
    seasonId: string,
  ): Promise<UpdateTeamResponseDTO> {
    await this.findTeamOrThrowUseCase.execute(id);

    const data: UpdateTeamData = {
      name: dto.name,
      crestUrl: dto.crestUrl,
      leagueId: dto.leagueId,
      formation: dto.formation
        ? FORMATION_DISPLAY_TO_ENUM[dto.formation]
        : undefined,
    };

    try {
      await this.teamsRepository.update(id, data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          throw new ConflictException(
            'Já existe um time com esse nome nessa liga',
          );
        }
        if (error.code === FOREIGN_KEY_VIOLATION) {
          throw new BadRequestException('Liga não encontrada');
        }
      }
      throw error;
    }

    return this.getTeamUseCase.execute(id, seasonId);
  }
}

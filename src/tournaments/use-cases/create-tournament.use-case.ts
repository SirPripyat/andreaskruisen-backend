import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma, Tournament } from '../../../generated/prisma/client';
import { SeasonsRepository } from '../../seasons/seasons.repository';
import { CreateTournament } from '../dto';
import { TournamentsRepository } from '../tournaments.repository';
import { buildFirstPhase, shuffle } from '../utils';

const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class CreateTournamentUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  @Transactional()
  async execute(seasonId: string, dto: CreateTournament): Promise<Tournament> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) throw new NotFoundException('Temporada não encontrada');

    const tournament = await this.tournamentsRepository.create({
      seasonId,
      name: dto.name,
      format: dto.format,
      maxTeams: dto.maxTeams,
    });

    this.registerTeamsInTournament(tournament.id, dto.teamIds);
    this.generatePhase(tournament.id, dto);

    return tournament;
  }

  private registerTeamsInTournament(id: string, teamIds: string[]) {
    this.tournamentsRepository.createTeams(id, teamIds).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      )
        throw new BadRequestException('Time não encontrado');

      throw error;
    });
  }

  private async generatePhase(id: string, dto: CreateTournament) {
    const shuffledTeamIds = shuffle(dto.teamIds);

    const firstPhase = buildFirstPhase(dto.format, shuffledTeamIds);

    await this.tournamentsRepository.createPhaseWithMatches({
      tournamentId: id,
      order: 1,
      ...firstPhase,
    });
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Squad } from '../../generated/prisma/client';
import { SeasonsRepository } from '../seasons/seasons.repository';
import { AssignSquad } from './dto/assign-squad.schema';
import { ChooseSquad } from './dto/choose-squad.schema';
import {
  RosterPlayer,
  SquadsRepository,
  SquadWithRelations,
} from './squads.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class SquadsService {
  constructor(
    private readonly squadsRepository: SquadsRepository,
    private readonly seasonsRepository: SeasonsRepository,
  ) {}

  async listForSeason(seasonId: string): Promise<SquadWithRelations[]> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    return this.squadsRepository.findAllForSeason(seasonId);
  }

  async choose(
    userId: string,
    seasonId: string,
    dto: ChooseSquad,
  ): Promise<Squad> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    const existing = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );
    if (existing) {
      throw new ConflictException('Você já escolheu um time nessa temporada');
    }

    try {
      return await this.squadsRepository.create({
        seasonId,
        userId,
        teamId: dto.teamId,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          throw new ConflictException(
            'Esse time já foi escolhido por outro participante nessa temporada',
          );
        }
        if (error.code === FOREIGN_KEY_VIOLATION) {
          throw new BadRequestException('Time não encontrado');
        }
      }
      throw error;
    }
  }

  // Vínculo feito por um admin (ex.: ao cadastrar um torneio), diferente de
  // `choose`: aqui é o admin quem escolhe o usuário, não o próprio usuário.
  async assign(seasonId: string, dto: AssignSquad): Promise<Squad> {
    const season = await this.seasonsRepository.findById(seasonId);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    const [existingForUser, existingForTeam] = await Promise.all([
      this.squadsRepository.findByUserAndSeason(dto.userId, seasonId),
      this.squadsRepository.findByTeamAndSeason(dto.teamId, seasonId),
    ]);

    if (existingForUser) {
      throw new ConflictException(
        'Esse usuário já comanda um time nessa temporada',
      );
    }
    if (existingForTeam) {
      throw new ConflictException('Esse time já tem dono nessa temporada');
    }

    try {
      return await this.squadsRepository.create({
        seasonId,
        userId: dto.userId,
        teamId: dto.teamId,
      });
    } catch (error) {
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
    }
  }

  async getMine(
    userId: string,
    seasonId: string,
  ): Promise<{ squad: Squad; players: RosterPlayer[] }> {
    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );
    if (!squad) {
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );
    }

    const players = await this.squadsRepository.findRoster(
      seasonId,
      squad.teamId,
    );

    return { squad, players };
  }
}

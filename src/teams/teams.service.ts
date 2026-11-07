import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client';
import { PaginatedResult } from '../commons/pagination';
import { FORMATION_DISPLAY_TO_ENUM } from '../import/formation-mapper';
import { TeamAliasResolutionFileSchema } from '../import/scraper-team-alias-resolution.schema';
import { ScraperTeamCrestSchema } from '../import/scraper-team-crest.schema';
import { ScraperTeamFormationSchema } from '../import/scraper-team-formation.schema';
import { ScraperTeamLineupsFileSchema } from '../import/scraper-team-lineup.schema';
import {
  importTeamAliases,
  TeamAliasImportSummary,
} from '../import/team-alias-import';
import {
  importTeamCrests,
  TeamCrestImportSummary,
} from '../import/team-crest-import';
import {
  importTeamFormations,
  TeamFormationImportSummary,
} from '../import/team-formation-import';
import {
  importTeamLineups,
  TeamLineupImportSummary,
} from '../import/team-lineup-import';
import { PrismaService } from '../prisma';
import {
  TeamStats,
  TeamTitle,
  TournamentsService,
} from '../tournaments/tournaments.service';
import { ListTeamsQuery } from './dto/list-teams.schema';
import { UpdateTeam } from './dto/update-team.schema';
import {
  TeamsRepository,
  TeamWithRatings,
  UpdateTeamData,
} from './teams.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

export type TeamDetail = TeamWithRatings & TeamStats;

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsRepository: TeamsRepository,
    private readonly tournamentsService: TournamentsService,
  ) {}

  list(query: ListTeamsQuery): Promise<PaginatedResult<TeamWithRatings>> {
    return this.teamsRepository.findPaginated(
      {
        name: query.name,
        leagueId: query.leagueId,
        withoutFormation: query.withoutFormation,
      },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );
  }

  async getOne(id: string): Promise<TeamDetail> {
    const team = await this.findOrThrow(id);
    const stats = await this.tournamentsService.getTeamStats(id);
    return { ...team, ...stats };
  }

  async getTitles(id: string): Promise<TeamTitle[]> {
    await this.findOrThrow(id);
    return this.tournamentsService.getTitlesForTeam(id);
  }

  async update(id: string, dto: UpdateTeam): Promise<TeamDetail> {
    await this.findOrThrow(id);

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

    return this.getOne(id);
  }

  async importFormationsFromJson(
    fileBuffer: Buffer,
  ): Promise<TeamFormationImportSummary> {
    let raw: unknown;
    try {
      raw = JSON.parse(fileBuffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Arquivo não é um JSON válido');
    }

    const parsed = z.array(ScraperTeamFormationSchema).safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'JSON não corresponde ao schema de formações esperado',
        errors: parsed.error.issues,
      });
    }

    return importTeamFormations(this.prisma, parsed.data);
  }

  // Escalação titular real (SoFIFA), não calculada: casa cada titular pelo
  // Player.eaId, resolve o time pelo voto majoritário dos titulares batidos
  // (mais confiável que casar pelo nome, que não bate entre os JSONs do
  // scraper) e grava a formação + a escalação de uma vez — ver
  // importTeamLineups.
  async importLineupsFromJson(
    fileBuffer: Buffer,
  ): Promise<TeamLineupImportSummary> {
    let raw: unknown;
    try {
      raw = JSON.parse(fileBuffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Arquivo não é um JSON válido');
    }

    const parsed = ScraperTeamLineupsFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'JSON não corresponde ao schema de escalações esperado',
        errors: parsed.error.issues,
      });
    }

    return importTeamLineups(this.prisma, parsed.data.teams);
  }

  // Escudos oficiais do catálogo de times da EA (arquivo separado do de
  // jogadores, das formações e das escalações): casa por name + liga (mesma
  // chave natural do Team) e só sobrescreve crestUrl — ver
  // TeamsService.importCrestsFromJson e importTeamCrests pra notFound/
  // ambiguous/skippedFeminino.
  async importCrestsFromJson(
    fileBuffer: Buffer,
  ): Promise<TeamCrestImportSummary> {
    let raw: unknown;
    try {
      raw = JSON.parse(fileBuffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Arquivo não é um JSON válido');
    }

    const parsed = z.array(ScraperTeamCrestSchema).safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'JSON não corresponde ao schema de escudos esperado',
        errors: parsed.error.issues,
      });
    }

    return importTeamCrests(this.prisma, parsed.data);
  }

  // Resolução manual dos "notFound" do import de escudos: aceita o mesmo
  // arquivo gerado em data/team-crest-notfound.json depois que um humano
  // preenche resolved_team_name nas entradas que reconhece (ex.: "Alem.
  // Aachen" -> "Alemannia Aachen") e cria o TeamAlias correspondente — ver
  // TeamsService.importAliasesFromJson e importTeamAliases.
  async importAliasesFromJson(
    fileBuffer: Buffer,
  ): Promise<TeamAliasImportSummary> {
    let raw: unknown;
    try {
      raw = JSON.parse(fileBuffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Arquivo não é um JSON válido');
    }

    const parsed = TeamAliasResolutionFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message:
          'JSON não corresponde ao schema de resolução de aliases esperado',
        errors: parsed.error.issues,
      });
    }

    return importTeamAliases(this.prisma, parsed.data.entries);
  }

  private async findOrThrow(id: string): Promise<TeamWithRatings> {
    const team = await this.teamsRepository.findById(id);
    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }
    return team;
  }
}

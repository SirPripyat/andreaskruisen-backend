import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PaginatedResult } from '../commons/pagination';
import { importPlayers, PlayerImportSummary } from '../import/player-import';
import { ScraperPlayerSchema } from '../import/scraper-player.schema';
import { PrismaService } from '../prisma';
import { ListPlayersQuery } from './dto/list-players.schema';
import { PlayersRepository } from './players.repository';

export interface PlayerListItem {
  id: string;
  eaId: number;
  name: string;
  photoUrl: string;
  birthdate: Date;
  preferredFoot: string;
  team: { id: string; name: string; crestUrl: string };
  nationality: { id: string; name: string; flagUrl: string };
  positions: { position: string; isPrimary: boolean }[];
  latestRating: { overallRating: number; capturedAt: Date } | null;
}

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playersRepository: PlayersRepository,
  ) {}

  async list(
    query: ListPlayersQuery,
  ): Promise<PaginatedResult<PlayerListItem>> {
    const result = await this.playersRepository.findPaginated(
      { name: query.name },
      query,
    );

    return {
      ...result,
      data: result.data.map((player) => ({
        id: player.id,
        eaId: player.eaId,
        name: player.name,
        photoUrl: player.photoUrl,
        birthdate: player.birthdate,
        preferredFoot: player.preferredFoot,
        team: {
          id: player.team.id,
          name: player.team.name,
          crestUrl: player.team.crestUrl,
        },
        nationality: {
          id: player.nationality.id,
          name: player.nationality.name,
          flagUrl: player.nationality.flagUrl,
        },
        positions: player.positions.map((position) => ({
          position: position.position,
          isPrimary: position.isPrimary,
        })),
        latestRating: player.ratings[0]
          ? {
              overallRating: player.ratings[0].overallRating,
              capturedAt: player.ratings[0].capturedAt,
            }
          : null,
      })),
    };
  }

  async importFromJson(
    fileBuffer: Buffer,
    capturedAt: Date,
  ): Promise<PlayerImportSummary> {
    let raw: unknown;
    try {
      raw = JSON.parse(fileBuffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Arquivo não é um JSON válido');
    }

    const parsed = z.array(ScraperPlayerSchema).safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'JSON não corresponde ao schema de jogadores esperado',
        errors: parsed.error.issues,
      });
    }

    return importPlayers(this.prisma, parsed.data, capturedAt);
  }
}

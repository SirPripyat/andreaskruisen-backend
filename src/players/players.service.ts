import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { importPlayers, PlayerImportSummary } from '../import/player-import';
import { ScraperPlayerSchema } from '../import/scraper-player.schema';
import { PrismaService } from '../prisma';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

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

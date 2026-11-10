import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  PlayersRepository,
  PlayerTeamDimension,
} from '../../players/players.repository';
import { TeamsRepository } from '../../teams/teams.repository';
import { LineupSlotInput } from '../../teams/types';
import { IMPORT_LINEUP_BATCH_SIZE } from '../constants';
import { ScraperTeamLineup, ScraperTeamLineupSchema } from '../dto';
import { TeamLineupImportSummary } from '../types';
import {
  FORMATION_DISPLAY_TO_ENUM,
  LINEUP_POSITION_TO_ENUM,
  parseJsonBuffer,
  processInBatches,
} from '../utils';

@Injectable()
export class ImportTeamLineupsUseCase {
  private readonly logger = new Logger(ImportTeamLineupsUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly playersRepository: PlayersRepository,
  ) {}

  async execute(fileBuffer: Buffer): Promise<TeamLineupImportSummary> {
    const { rows, invalid } = this.parseRows(fileBuffer);
    const summary = await this.importLineups(rows);

    return { ...summary, invalid: [...invalid, ...summary.invalid] };
  }

  private parseRows(fileBuffer: Buffer): {
    rows: ScraperTeamLineup[];
    invalid: string[];
  } {
    const { teams: rawItems } = parseJsonBuffer(
      fileBuffer,
      z.object({ teams: z.array(z.unknown()) }),
      'escalações',
    );

    const rows: ScraperTeamLineup[] = [];
    const invalid: string[] = [];

    rawItems.forEach((item, index) => {
      const parsed = ScraperTeamLineupSchema.safeParse(item);
      if (parsed.success) {
        rows.push(parsed.data);
        return;
      }

      const reason = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      this.logger.warn(
        `Escalação inválida no JSON (índice ${index}): ${reason}`,
      );
      invalid.push(`índice ${index}: ${reason}`);
    });

    return { rows, invalid };
  }

  private async importLineups(
    rows: ScraperTeamLineup[],
  ): Promise<TeamLineupImportSummary> {
    const startedAt = Date.now();
    const allEaIds = new Set<number>();

    for (const row of rows) {
      for (const slot of row.starting_xi) {
        allEaIds.add(slot.player_id);
      }
    }

    const playersByEaId =
      await this.playersRepository.findTeamDimensionsByEaIds(
        Array.from(allEaIds),
      );

    let updated = 0;
    const notFound: string[] = [];
    let playersNotFound = 0;
    let staleTeamSlots = 0;

    await processInBatches(rows, IMPORT_LINEUP_BATCH_SIZE, async (row) => {
      const teamId = this.resolveTeamId(row.starting_xi, playersByEaId);
      if (!teamId) {
        notFound.push(row.short_name);
        return;
      }

      const slots: LineupSlotInput[] = [];
      for (const slot of row.starting_xi) {
        const player = playersByEaId.get(slot.player_id);
        if (!player) {
          playersNotFound++;
          continue;
        }
        if (player.teamId !== teamId) {
          staleTeamSlots++;
          continue;
        }
        slots.push({
          playerId: player.id,
          position: LINEUP_POSITION_TO_ENUM[slot.position],
        });
      }

      try {
        await this.teamsRepository.replaceLineup(
          teamId,
          FORMATION_DISPLAY_TO_ENUM[row.formation],
          slots,
        );
        updated++;
      } catch (error) {
        this.logger.error(
          `Erro de infraestrutura importando escalação do time "${row.short_name}": ${
            error instanceof Error ? error.message : 'erro desconhecido'
          }`,
        );
        throw error;
      }
    });

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Import de escalações concluído: processed=${rows.length}, updated=${updated}, notFound=${notFound.length}, playersNotFound=${playersNotFound}, staleTeamSlots=${staleTeamSlots}, durationMs=${durationMs}`,
    );

    return {
      processed: rows.length,
      updated,
      notFound,
      playersNotFound,
      staleTeamSlots,
      invalid: [],
    };
  }

  private resolveTeamId(
    slots: ScraperTeamLineup['starting_xi'],
    playersByEaId: Map<number, PlayerTeamDimension>,
  ): string | undefined {
    const votes = new Map<string, number>();

    for (const slot of slots) {
      const player = playersByEaId.get(slot.player_id);

      if (player) votes.set(player.teamId, (votes.get(player.teamId) ?? 0) + 1);
    }

    let bestTeamId: string | undefined;
    let bestCount = 0;

    for (const [teamId, count] of votes) {
      if (count > bestCount) {
        bestTeamId = teamId;
        bestCount = count;
      }
    }

    return bestTeamId;
  }
}

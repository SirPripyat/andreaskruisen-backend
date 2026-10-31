import { PositionCode, PrismaClient } from '../../generated/prisma/client';
import { FORMATION_DISPLAY_TO_ENUM } from './formation-mapper';
import { LINEUP_POSITION_TO_ENUM } from './lineup-position-mapper';
import { processInBatches } from './player-import';
import type { ScraperTeamLineup } from './scraper-team-lineup.schema';

export const IMPORT_LINEUP_BATCH_SIZE = 25;

export interface TeamLineupImportSummary {
  processed: number;
  updated: number;
  // Nenhum titular do JSON bateu com Player.eaId: time provavelmente ainda
  // não teve o elenco importado (ver notFound em importTeamFormations).
  notFound: string[];
  // Titulares do JSON cujo eaId não existe em nenhum Player (scraper de
  // jogadores desatualizado ou dessincronizado com o de escalações).
  playersNotFound: number;
  // Titulares batidos por eaId, mas cujo Player.teamId atual é diferente do
  // time majoritário resolvido pra essa entrada — provável transferência
  // entre os snapshots dos dois scrapers. Não entram na escalação salva.
  staleTeamSlots: number;
}

// Resolve qual Team essa entrada do JSON representa a partir do voto
// majoritário do Player.teamId atual dos titulares batidos por eaId — bem
// mais confiável do que casar pelo nome do time (os dois scrapers usam
// convenções de nome diferentes).
function resolveTeamId(
  slots: ScraperTeamLineup['starting_xi'],
  playersByEaId: Map<number, { id: string; teamId: string }>,
): string | undefined {
  const votes = new Map<string, number>();
  for (const slot of slots) {
    const player = playersByEaId.get(slot.player_id);
    if (player) {
      votes.set(player.teamId, (votes.get(player.teamId) ?? 0) + 1);
    }
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

export async function importTeamLineups(
  prisma: PrismaClient,
  rows: ScraperTeamLineup[],
): Promise<TeamLineupImportSummary> {
  const allEaIds = new Set<number>();
  for (const row of rows) {
    for (const slot of row.starting_xi) {
      allEaIds.add(slot.player_id);
    }
  }

  const players = await prisma.player.findMany({
    where: { eaId: { in: Array.from(allEaIds) } },
    select: { id: true, eaId: true, teamId: true },
  });
  const playersByEaId = new Map(players.map((p) => [p.eaId, p]));

  let updated = 0;
  const notFound: string[] = [];
  let playersNotFound = 0;
  let staleTeamSlots = 0;

  await processInBatches(rows, IMPORT_LINEUP_BATCH_SIZE, async (row) => {
    const teamId = resolveTeamId(row.starting_xi, playersByEaId);
    if (!teamId) {
      notFound.push(row.short_name);
      return;
    }

    const assignments: { playerId: string; position: PositionCode }[] = [];
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
      assignments.push({
        playerId: player.id,
        position: LINEUP_POSITION_TO_ENUM[slot.position],
      });
    }

    await prisma.$transaction([
      prisma.team.update({
        where: { id: teamId },
        data: { formation: FORMATION_DISPLAY_TO_ENUM[row.formation] },
      }),
      prisma.teamLineupSlot.deleteMany({ where: { teamId } }),
      prisma.teamLineupSlot.createMany({
        data: assignments.map((assignment) => ({
          teamId,
          playerId: assignment.playerId,
          position: assignment.position,
        })),
      }),
    ]);
    updated++;
  });

  return {
    processed: rows.length,
    updated,
    notFound,
    playersNotFound,
    staleTeamSlots,
  };
}

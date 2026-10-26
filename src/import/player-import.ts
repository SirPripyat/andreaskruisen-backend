import { PrismaClient } from '../../generated/prisma/client';
import {
  mapPositions,
  mapPreferredFoot,
  mapRating,
  parseBirthdate,
  ratingsEqual,
} from './player-mapper';
import type { ScraperPlayer } from './scraper-player.schema';

export const IMPORT_BATCH_SIZE = 25;

export interface PlayerImportSummary {
  processed: number;
  ratingsInserted: number;
}

export async function upsertDimensions(
  prisma: PrismaClient,
  players: ScraperPlayer[],
) {
  const flagUrlByNationality = new Map<string, string>();
  const leagueNames = new Set<string>();
  const teamByCrestUrl = new Map<string, { name: string; league: string }>();

  for (const player of players) {
    flagUrlByNationality.set(player.nationality, player.nationalityFlagUrl);
    leagueNames.add(player.league);
    teamByCrestUrl.set(player.teamCrestUrl, {
      name: player.team,
      league: player.league,
    });
  }

  const nationalityIdByName = new Map<string, string>();
  for (const [name, flagUrl] of flagUrlByNationality) {
    const row = await prisma.nationality.upsert({
      where: { name },
      create: { name, flagUrl },
      update: { flagUrl },
    });
    nationalityIdByName.set(name, row.id);
  }

  const leagueIdByName = new Map<string, string>();
  for (const name of leagueNames) {
    const row = await prisma.league.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    leagueIdByName.set(name, row.id);
  }

  const teamIdByCrestUrl = new Map<string, string>();
  for (const [crestUrl, { name, league }] of teamByCrestUrl) {
    const leagueId = leagueIdByName.get(league);
    if (leagueId === undefined) {
      throw new Error(`Liga "${league}" não resolvida para o time "${name}"`);
    }
    const row = await prisma.team.upsert({
      where: { crestUrl },
      create: { crestUrl, name, leagueId },
      update: { name, leagueId },
    });
    teamIdByCrestUrl.set(crestUrl, row.id);
  }

  return { nationalityIdByName, teamIdByCrestUrl };
}

export async function importPlayer(
  prisma: PrismaClient,
  player: ScraperPlayer,
  capturedAt: Date,
  nationalityIdByName: Map<string, string>,
  teamIdByCrestUrl: Map<string, string>,
): Promise<{ ratingInserted: boolean }> {
  const nationalityId = nationalityIdByName.get(player.nationality);
  const teamId = teamIdByCrestUrl.get(player.teamCrestUrl);
  if (nationalityId === undefined || teamId === undefined) {
    throw new Error(
      `Dimensões não resolvidas para o jogador ${player.name} (eaId ${player.id})`,
    );
  }

  const dbPlayer = await prisma.player.upsert({
    where: { eaId: player.id },
    create: {
      eaId: player.id,
      name: player.name,
      photoUrl: player.photoUrl,
      birthdate: parseBirthdate(player.birthdate),
      preferredFoot: mapPreferredFoot(player.preferredFoot),
      nationalityId,
      teamId,
      latestOverallRating: player.overallRating,
    },
    update: {
      name: player.name,
      photoUrl: player.photoUrl,
      birthdate: parseBirthdate(player.birthdate),
      preferredFoot: mapPreferredFoot(player.preferredFoot),
      nationalityId,
      teamId,
      latestOverallRating: player.overallRating,
    },
  });

  await prisma.$transaction([
    prisma.playerPosition.deleteMany({ where: { playerId: dbPlayer.id } }),
    prisma.playerPosition.createMany({
      data: mapPositions(player).map((position) => ({
        playerId: dbPlayer.id,
        ...position,
      })),
    }),
  ]);

  const latestRating = await prisma.playerRating.findFirst({
    where: { playerId: dbPlayer.id },
    orderBy: { capturedAt: 'desc' },
  });

  const newRating = mapRating(player);
  if (latestRating && ratingsEqual(latestRating, newRating)) {
    return { ratingInserted: false };
  }

  await prisma.playerRating.create({
    data: { playerId: dbPlayer.id, capturedAt, ...newRating },
  });
  return { ratingInserted: true };
}

export async function processInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

export async function importPlayers(
  prisma: PrismaClient,
  players: ScraperPlayer[],
  capturedAt: Date,
  onProgress?: (processed: number, total: number) => void,
): Promise<PlayerImportSummary> {
  const { nationalityIdByName, teamIdByCrestUrl } = await upsertDimensions(
    prisma,
    players,
  );

  let processed = 0;
  let ratingsInserted = 0;

  await processInBatches(players, IMPORT_BATCH_SIZE, async (player) => {
    const result = await importPlayer(
      prisma,
      player,
      capturedAt,
      nationalityIdByName,
      teamIdByCrestUrl,
    );
    if (result.ratingInserted) ratingsInserted++;
    processed++;
    onProgress?.(processed, players.length);
  });

  return { processed, ratingsInserted };
}

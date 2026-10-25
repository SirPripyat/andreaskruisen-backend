import { readFileSync, statSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient } from '../../generated/prisma/client';
import {
  mapPositions,
  mapPreferredFoot,
  mapRating,
  parseBirthdate,
  ratingsEqual,
} from './player-mapper';
import { ScraperPlayerSchema, type ScraperPlayer } from './scraper-player.schema';

const BATCH_SIZE = 25;

interface ParsedArgs {
  filePath: string;
  capturedAt: Date;
}

function parseArgs(argv: string[]): ParsedArgs {
  const filePath = argv[2];
  if (!filePath) {
    throw new Error(
      'Uso: pnpm import:players <caminho-do-json> [--captured-at=2026-10-25T00:00:00Z]',
    );
  }

  const capturedAtArg = argv.find((arg) => arg.startsWith('--captured-at='));
  // Sem override explícito, assume que o scraper rodou quando o arquivo foi escrito,
  // não quando o import foi executado (podem ser momentos bem diferentes).
  const capturedAt = capturedAtArg
    ? new Date(capturedAtArg.slice('--captured-at='.length))
    : statSync(filePath).mtime;

  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error('--captured-at inválido: use um timestamp ISO 8601.');
  }

  return { filePath, capturedAt };
}

async function upsertDimensions(prisma: PrismaClient, players: ScraperPlayer[]) {
  const flagUrlByNationality = new Map<string, string>();
  const leagueNames = new Set<string>();
  const teamByCrestUrl = new Map<string, { name: string; league: string }>();

  for (const player of players) {
    flagUrlByNationality.set(player.nationality, player.nationalityFlagUrl);
    leagueNames.add(player.league);
    teamByCrestUrl.set(player.teamCrestUrl, { name: player.team, league: player.league });
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

  console.log(
    `Dimensões: ${nationalityIdByName.size} nacionalidades, ${leagueIdByName.size} ligas, ${teamIdByCrestUrl.size} times.`,
  );

  return { nationalityIdByName, teamIdByCrestUrl };
}

async function importPlayer(
  prisma: PrismaClient,
  player: ScraperPlayer,
  capturedAt: Date,
  nationalityIdByName: Map<string, string>,
  teamIdByCrestUrl: Map<string, string>,
): Promise<{ ratingInserted: boolean }> {
  const nationalityId = nationalityIdByName.get(player.nationality);
  const teamId = teamIdByCrestUrl.get(player.teamCrestUrl);
  if (nationalityId === undefined || teamId === undefined) {
    throw new Error(`Dimensões não resolvidas para o jogador ${player.name} (eaId ${player.id})`);
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
    },
    update: {
      name: player.name,
      photoUrl: player.photoUrl,
      birthdate: parseBirthdate(player.birthdate),
      preferredFoot: mapPreferredFoot(player.preferredFoot),
      nationalityId,
      teamId,
    },
  });

  await prisma.$transaction([
    prisma.playerPosition.deleteMany({ where: { playerId: dbPlayer.id } }),
    prisma.playerPosition.createMany({
      data: mapPositions(player).map((position) => ({ playerId: dbPlayer.id, ...position })),
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

async function processInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

async function main() {
  const { filePath, capturedAt } = parseArgs(process.argv);

  console.log(`Lendo ${filePath}...`);
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

  console.log('Validando schema do scraper...');
  const players = z.array(ScraperPlayerSchema).parse(raw);
  console.log(`${players.length} jogadores validados. capturedAt = ${capturedAt.toISOString()}`);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const { nationalityIdByName, teamIdByCrestUrl } = await upsertDimensions(prisma, players);

    let processed = 0;
    let ratingsInserted = 0;

    await processInBatches(players, BATCH_SIZE, async (player) => {
      const result = await importPlayer(
        prisma,
        player,
        capturedAt,
        nationalityIdByName,
        teamIdByCrestUrl,
      );
      if (result.ratingInserted) ratingsInserted++;
      processed++;
      if (processed % 1000 === 0 || processed === players.length) {
        console.log(`${processed}/${players.length} jogadores processados...`);
      }
    });

    console.log(
      `Concluído: ${processed} jogadores processados, ${ratingsInserted} novos registros de rating gravados.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

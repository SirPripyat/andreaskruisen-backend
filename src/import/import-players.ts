import { readFileSync, statSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient } from '../../generated/prisma/client';
import { importPlayers } from './player-import';
import { ScraperPlayerSchema } from './scraper-player.schema';

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

async function main() {
  const { filePath, capturedAt } = parseArgs(process.argv);

  console.log(`Lendo ${filePath}...`);
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

  console.log('Validando schema do scraper...');
  const players = z.array(ScraperPlayerSchema).parse(raw);
  console.log(
    `${players.length} jogadores validados. capturedAt = ${capturedAt.toISOString()}`,
  );

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const { processed, ratingsInserted } = await importPlayers(
      prisma,
      players,
      capturedAt,
      (done, total) => {
        if (done % 1000 === 0 || done === total) {
          console.log(`${done}/${total} jogadores processados...`);
        }
      },
    );

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

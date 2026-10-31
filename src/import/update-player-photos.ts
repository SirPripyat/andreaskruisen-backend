import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { processInBatches } from './player-import';
import { buildEaPlayerPhotoUrl } from './player-mapper';

// Backfill único: jogadores importados antes da troca do photoUrl (SoFIFA,
// bloqueado para carregamento direto) para a URL de imagem da EA (ver
// buildEaPlayerPhotoUrl). Importações novas já saem corretas; isto corrige o
// que já está no banco.
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const players = await prisma.player.findMany({
      select: { id: true, eaId: true },
    });
    console.log(`Atualizando foto de ${players.length} jogadores...`);

    let updated = 0;
    await processInBatches(players, 25, async (player) => {
      await prisma.player.update({
        where: { id: player.id },
        data: { photoUrl: buildEaPlayerPhotoUrl(player.eaId) },
      });
      updated++;
      if (updated % 1000 === 0 || updated === players.length) {
        console.log(`${updated}/${players.length} atualizados...`);
      }
    });

    console.log(`Concluído: ${updated} jogadores atualizados.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

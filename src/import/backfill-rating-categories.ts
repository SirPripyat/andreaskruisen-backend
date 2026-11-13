import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// Preenche pac/sho/pas/dri/def/phy só onde estão nulos (nunca sobrescreve
// um valor que o scraper já tenha enviado), com a mesma fórmula de
// src/import/utils/rating-categories.utils.ts — mantenha as duas em sync
// se a fórmula mudar. SQL bruto, não linha a linha via Prisma, porque isso
// roda sobre todo o histórico de PlayerRating de uma vez (dezenas de
// milhares de linhas).
const run = async () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const updated = await prisma.$executeRaw`
    UPDATE "PlayerRating"
    SET
      "pac" = COALESCE("pac", ROUND(("acceleration" + "sprintSpeed") / 2.0)::INTEGER),
      "sho" = COALESCE("sho", ROUND(("positioning" + "finishing" + "shotPower" + "longShots" + "volleys" + "penalties") / 6.0)::INTEGER),
      "pas" = COALESCE("pas", ROUND(("vision" + "crossing" + "freeKickAccuracy" + "shortPassing" + "longPassing" + "curve") / 6.0)::INTEGER),
      "dri" = COALESCE("dri", ROUND(("agility" + "balance" + "reactions" + "ballControl" + "dribbling" + "composure") / 6.0)::INTEGER),
      "def" = COALESCE("def", ROUND(("interceptions" + "headingAccuracy" + "defensiveAwareness" + "standingTackle" + "slidingTackle") / 5.0)::INTEGER),
      "phy" = COALESCE("phy", ROUND(("jumping" + "stamina" + "strength" + "aggression") / 4.0)::INTEGER)
    WHERE "pac" IS NULL OR "sho" IS NULL OR "pas" IS NULL OR "dri" IS NULL OR "def" IS NULL OR "phy" IS NULL
  `;

  console.log(`Linhas atualizadas: ${updated}`);
  await prisma.$disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

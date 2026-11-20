import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '/Users/leonardorossi/Desktop/dev/andreuskruisen-backend/generated/prisma/client';
import { DEFAULT_RULESET_PAYLOAD } from '/Users/leonardorossi/Desktop/dev/andreuskruisen-backend/src/rulesets/constants/default-ruleset-payload';
import { calculateInitialBalances } from '/Users/leonardorossi/Desktop/dev/andreuskruisen-backend/src/seasons/utils/initial-balance.utils';
import { RulesetPayloadSchema } from '/Users/leonardorossi/Desktop/dev/andreuskruisen-backend/src/rulesets/schemas/ruleset-payload.schema';

const SEED_BATCH_SIZE = 5000;

const run = async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const name = `repro-${Date.now()}`;
  const squadsInput = [
    { userId: 'f0d17bc6-db25-4ddd-b02f-c4e6c649d1fb', teamId: '42d5633e-b231-4385-9b51-4a33d709e173' },
    { userId: '3f9e7a33-be20-4a4d-9a18-24ec1748a10c', teamId: '90e9bdf0-704d-4700-b734-8c4559befc03' },
  ];

  try {
    await prisma.$transaction(async (tx) => {
      console.log('1) season.create');
      const season = await tx.season.create({ data: { name } });

      console.log('2) seedPlayerAssignmentsFromRealTeams');
      const players = await tx.player.findMany({
        select: {
          id: true,
          teamId: true,
          lineupSlots: { select: { position: true }, take: 1 },
        },
      });
      console.log('   players found:', players.length);
      for (let i = 0; i < players.length; i += SEED_BATCH_SIZE) {
        const batch = players.slice(i, i + SEED_BATCH_SIZE);
        await tx.playerTeamAssignment.createMany({
          data: batch.map((player) => ({
            seasonId: season.id,
            playerId: player.id,
            teamId: player.teamId,
            isStarter: player.lineupSlots.length > 0,
            lineupPosition: player.lineupSlots[0]?.position,
          })),
        });
      }

      console.log('3) createSquads');
      await tx.squad.createMany({
        data: squadsInput.map((s) => ({
          seasonId: season.id,
          userId: s.userId,
          teamId: s.teamId,
        })),
      });

      console.log('4) seedDefaultRuleset');
      await tx.ruleset.create({
        data: { seasonId: season.id, version: 1, payload: DEFAULT_RULESET_PAYLOAD },
      });

      console.log('5) getActiveRuleset');
      const now = new Date();
      const ruleset = await tx.ruleset.findFirst({
        where: { seasonId: season.id, validFrom: { lte: now } },
        orderBy: { validFrom: 'desc' },
      });
      if (!ruleset) throw new Error('no ruleset found');
      const payload = RulesetPayloadSchema.parse(ruleset.payload) as any;

      console.log('6) findSquadsWithPlayerOveralls');
      const [squads, assignments] = await Promise.all([
        tx.squad.findMany({ where: { seasonId: season.id }, select: { id: true, teamId: true } }),
        tx.playerTeamAssignment.findMany({
          where: { seasonId: season.id },
          select: { teamId: true, player: { select: { latestOverallRating: true } } },
        }),
      ]);
      const overallsByTeamId = new Map<string, number[]>();
      for (const a of assignments) {
        const list = overallsByTeamId.get(a.teamId) ?? [];
        list.push(a.player.latestOverallRating);
        overallsByTeamId.set(a.teamId, list);
      }
      const squadOveralls = squads.map((sq) => ({
        squadId: sq.id,
        playerOveralls: overallsByTeamId.get(sq.teamId) ?? [],
      }));
      console.log('   squadOveralls:', squadOveralls.map((s) => ({ squadId: s.squadId, count: s.playerOveralls.length })));

      console.log('7) calculateInitialBalances');
      const initialBalances = calculateInitialBalances(
        squadOveralls,
        payload.initialBalance.baseOverall,
        payload.transferPricing,
      );
      console.log('   initialBalances:', initialBalances);

      console.log('8) recordInitialBalances');
      await tx.coinTransaction.createMany({
        data: initialBalances.map((b) => ({ squadId: b.squadId, type: 'INITIAL', amount: b.initialBalance })),
      });
      await tx.season.update({ where: { id: season.id }, data: { economyStartedAt: new Date() } });

      console.log('ALL STEPS SUCCEEDED -- rolling back on purpose');
      throw new Error('__ROLLBACK__');
    });
  } catch (error) {
    if (error instanceof Error && error.message === '__ROLLBACK__') {
      console.log('Rolled back cleanly, no real error.');
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('PrismaClientKnownRequestError code=', error.code);
      console.error('meta=', JSON.stringify(error.meta));
      console.error('message=', error.message);
    } else {
      console.error('OTHER ERROR:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
};

run();

import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, Season } from '../../generated/prisma/client';

// Postgres recusa queries com mais de 65535 parâmetros bindados; cada linha
// de PlayerTeamAssignment usa 3 (seasonId, playerId, teamId), então esse
// tamanho de lote fica bem abaixo do limite mesmo com a base toda de jogadores.
const SEED_BATCH_SIZE = 5000;

@Injectable()
export class SeasonsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  create(data: { name: string }): Promise<Season> {
    return this.txHost.tx.season.create({ data });
  }

  findAll(): Promise<Season[]> {
    return this.txHost.tx.season.findMany({ orderBy: { startedAt: 'desc' } });
  }

  findById(id: string): Promise<Season | null> {
    return this.txHost.tx.season.findUnique({ where: { id } });
  }

  findActive(): Promise<Season | null> {
    return this.txHost.tx.season.findFirst({ where: { isActive: true } });
  }

  async setActive(id: string): Promise<Season> {
    await this.txHost.tx.season.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return this.txHost.tx.season.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async seedPlayerAssignmentsFromRealTeams(seasonId: string): Promise<number> {
    const players = await this.txHost.tx.player.findMany({
      select: { id: true, teamId: true },
    });

    for (let i = 0; i < players.length; i += SEED_BATCH_SIZE) {
      const batch = players.slice(i, i + SEED_BATCH_SIZE);
      await this.txHost.tx.playerTeamAssignment.createMany({
        data: batch.map((player) => ({
          seasonId,
          playerId: player.id,
          teamId: player.teamId,
        })),
      });
    }

    return players.length;
  }
}

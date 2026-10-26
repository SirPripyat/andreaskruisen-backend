import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, Squad } from '../../generated/prisma/client';

export interface RosterPlayer {
  id: string;
  name: string;
  photoUrl: string;
}

@Injectable()
export class SquadsRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  create(data: {
    seasonId: string;
    userId: string;
    teamId: string;
  }): Promise<Squad> {
    return this.txHost.tx.squad.create({ data });
  }

  findByUserAndSeason(userId: string, seasonId: string): Promise<Squad | null> {
    return this.txHost.tx.squad.findUnique({
      where: { seasonId_userId: { seasonId, userId } },
    });
  }

  async findRoster(seasonId: string, teamId: string): Promise<RosterPlayer[]> {
    const assignments = await this.txHost.tx.playerTeamAssignment.findMany({
      where: { seasonId, teamId },
      select: {
        player: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    return assignments.map((assignment) => assignment.player);
  }
}

import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaClient, Season, User } from '../../generated/prisma/client';
import { SelectSeasonResponseDTO, UpdateMeResponseDTO } from './dto';
import { UpdateMe } from './types';

@Injectable()
export class MeRepository {
  constructor(
    private readonly txHost: TransactionHost<
      TransactionalAdapterPrisma<PrismaClient>
    >,
  ) {}

  findByName(name: string): Promise<User | null> {
    return this.txHost.tx.user.findUnique({
      where: { name },
    });
  }

  update(id: string, data: UpdateMe): Promise<UpdateMeResponseDTO> {
    return this.txHost.tx.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        role: true,
      },
    });
  }

  selectSeason(id: string, seasonId: string): Promise<SelectSeasonResponseDTO> {
    return this.txHost.tx.user.update({
      where: { id },
      data: { selectedSeasonId: seasonId },
      select: {
        id: true,
        name: true,
        role: true,
        avatarPath: true,
        selectedSeasonId: true,
      },
    });
  }

  async findSelectedSeason(id: string): Promise<Season | null> {
    const user = await this.txHost.tx.user.findUnique({
      where: { id },
      select: { selectedSeason: true },
    });

    return user?.selectedSeason ?? null;
  }

  updateAvatarPath(id: string, avatarPath: string): Promise<User> {
    return this.txHost.tx.user.update({ where: { id }, data: { avatarPath } });
  }

  async findAvatarUrl(id: string): Promise<string | null> {
    const { avatarPath } = await this.txHost.tx.user.findUnique({
      where: { id },
      select: { avatarPath: true },
    });

    return avatarPath;
  }
}

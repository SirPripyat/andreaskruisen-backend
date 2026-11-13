import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma, Season } from '../../generated/prisma/client';
import { AuthenticatedUser } from '../auth/auth.service';
import { CreateSeason } from './dto/create-season.schema';
import { UpdateSeason } from './dto/update-season.schema';
import { SeasonsRepository } from './seasons.repository';
import { calculateInitialBalances } from './utils/initial-balance.utils';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

// Fixo por enquanto (ver docs/regras-temporada/saldo-inicial.md) — não está
// ligado a nenhuma outra regra do projeto, como o limite de jogadores por
// overall na composição do elenco.
const INITIAL_BALANCE_BASE_OVERALL = 79;

@Injectable()
export class SeasonsService {
  constructor(private readonly seasonsRepository: SeasonsRepository) {}

  @Transactional()
  async start(dto: CreateSeason): Promise<Season> {
    const season = await this.seasonsRepository.create({ name: dto.name });
    await this.seasonsRepository.seedPlayerAssignmentsFromRealTeams(season.id);

    try {
      await this.seasonsRepository.createSquads(season.id, dto.squads);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          throw new ConflictException(
            'Cada usuário e cada time só pode aparecer uma vez na temporada',
          );
        }
        if (error.code === FOREIGN_KEY_VIOLATION) {
          throw new BadRequestException('Usuário ou time não encontrado');
        }
      }
      throw error;
    }

    return this.startEconomy(season.id);
  }

  async findOne(id: string): Promise<Season> {
    return this.findOrThrow(id);
  }

  async update(id: string, dto: UpdateSeason): Promise<Season> {
    await this.findOrThrow(id);

    try {
      return await this.seasonsRepository.update(id, { name: dto.name });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Já existe uma temporada com esse nome');
      }
      throw error;
    }
  }

  @Transactional()
  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.seasonsRepository.delete(id).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new BadRequestException(
          'Não é possível excluir a temporada: existem dados vinculados a ela',
        );
      }
      throw error;
    });
  }

  findAll(): Promise<Season[]> {
    return this.seasonsRepository.findAll();
  }

  getActive(): Promise<Season | null> {
    return this.seasonsRepository.findActive();
  }

  @Transactional()
  async selectActive(id: string): Promise<Season> {
    await this.findOrThrow(id);
    return this.seasonsRepository.setActive(id);
  }

  // Calcula e lança o saldo inicial de cada squad da temporada (ver
  // docs/regras-temporada/saldo-inicial.md). Chamado só por start(), logo
  // depois dos squads serem criados — não existe mais um passo separado pra
  // isso, já que a season sempre nasce com todos os squads definidos. O
  // guard de economyStartedAt fica como proteção mesmo assim: nada aqui
  // pode rodar duas vezes pra uma mesma season.
  private async startEconomy(id: string): Promise<Season> {
    const season = await this.findOrThrow(id);

    if (season.economyStartedAt) {
      throw new ConflictException(
        'O saldo inicial dessa temporada já foi calculado',
      );
    }

    const squads =
      await this.seasonsRepository.findSquadsWithPlayerOveralls(id);
    const initialBalances = calculateInitialBalances(
      squads,
      INITIAL_BALANCE_BASE_OVERALL,
    );

    return this.seasonsRepository.recordInitialBalances(id, initialBalances);
  }

  // Resolve a temporada "efetiva" de um usuário: a que ele escolheu
  // pessoalmente (User.selectedSeasonId) ou, na falta dela, o default
  // global (Season.isActive). Usado por SeasonContextGuard pra tirar o
  // seasonId da URL nos endpoints de squads/tournaments/transfers. Retorna
  // null quando não há nem seleção pessoal nem temporada ativa — sinal pro
  // front-end mostrar a tela de seleção de temporada, não um erro.
  async getEffectiveSeasonId(
    user: Pick<AuthenticatedUser, 'selectedSeasonId'>,
  ): Promise<string | null> {
    if (user.selectedSeasonId) {
      return user.selectedSeasonId;
    }

    const active = await this.getActive();
    return active?.id ?? null;
  }

  private async findOrThrow(id: string): Promise<Season> {
    const season = await this.seasonsRepository.findById(id);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }
    return season;
  }
}

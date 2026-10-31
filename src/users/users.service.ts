import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { hash } from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { CreateUser, CreateUserSchema } from './dto/create-user.schema';
import { UsersRepository } from './users.repository';

const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    private readonly repository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const defaultUser = CreateUserSchema.parse({
      name: this.configService.getOrThrow('DEFAULT_USER_NAME'),
      pin: this.configService.getOrThrow('DEFAULT_USER_PIN'),
    });

    await this.ensureDefaultAdmin(defaultUser);
  }

  findAll() {
    return this.repository.findMany();
  }

  async create(dto: CreateUser) {
    const userExist = await this.repository.userExist(dto.name);

    if (userExist) {
      throw new ConflictException();
    }

    await this.repository.create({
      name: dto.name,
      pinHash: await this.hashPin(dto.pin),
    });
  }

  @Transactional()
  async remove(id: string, requestingUserId: string): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (id === requestingUserId) {
      throw new ConflictException(
        'Você não pode excluir o próprio usuário logado',
      );
    }

    try {
      await this.repository.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new ConflictException(
          'Usuário tem elenco ou transferências vinculadas e não pode ser excluído',
        );
      }
      throw error;
    }
  }

  async ensureDefaultAdmin(dto: CreateUser) {
    const user = await this.repository.findByName(dto.name);

    if (!user) {
      await this.repository.create({
        name: dto.name,
        pinHash: await this.hashPin(dto.pin),
        role: 'ADMIN',
      });
      return;
    }

    if (user.role !== 'ADMIN') {
      await this.repository.updateRole(user.id, 'ADMIN');
    }
  }

  private hashPin(pin: string): Promise<string> {
    return hash(pin, Number(this.configService.getOrThrow('SALT_ROUND')));
  }
}

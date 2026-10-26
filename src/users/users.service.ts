import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcrypt';
import { CreateUser, CreateUserSchema } from './dto/create-user.schema';
import { UsersRepository } from './users.repository';

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

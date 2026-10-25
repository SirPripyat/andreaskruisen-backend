import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcrypt';
import { CreateUser } from './dto/create-user.schema';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateUser) {
    const pinHash = await hash(
      dto.pin,
      Number(this.configService.getOrThrow('SALT_ROUND')),
    );

    const userExist = await this.repository.userExist(dto.name);

    if (userExist) {
      throw new ConflictException();
    }

    await this.repository.create({
      name: dto.name,
      pinHash,
    });
  }
}

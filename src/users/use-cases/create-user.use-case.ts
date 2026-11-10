import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUser } from '../dto/create-user.schema';
import { UsersRepository } from '../users.repository';
import { hashPin } from '../utils';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly repository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: CreateUser): Promise<void> {
    const userExist = await this.repository.userExist(dto.name);

    if (userExist) {
      throw new ConflictException();
    }

    await this.repository.create({
      name: dto.name,
      pinHash: await hashPin(
        dto.pin,
        Number(this.configService.getOrThrow('SALT_ROUND')),
      ),
    });
  }
}

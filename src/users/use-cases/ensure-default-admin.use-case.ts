import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashPin } from '../../commons/utils';
import { CreateUserSchema } from '../dto/request/create-user.schema';
import { UsersRepository } from '../users.repository';

@Injectable()
export class EnsureDefaultAdminUseCase {
  constructor(
    private readonly repository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(): Promise<void> {
    const defaultUser = CreateUserSchema.parse({
      name: this.configService.getOrThrow('DEFAULT_USER_NAME'),
      pin: this.configService.getOrThrow('DEFAULT_USER_PIN'),
    });

    const user = await this.repository.findByName(defaultUser.name);

    if (!user) {
      await this.repository.create({
        name: defaultUser.name,
        pinHash: await hashPin(
          defaultUser.pin,
          Number(this.configService.getOrThrow('SALT_ROUND')),
        ),
        role: 'ADMIN',
      });
      return;
    }

    if (user.role !== 'ADMIN')
      await this.repository.updateRole(user.id, 'ADMIN');
  }
}

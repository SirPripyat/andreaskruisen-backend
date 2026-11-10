import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../../../generated/prisma/client';
import { UpdateProfile } from '../dto/update-profile.schema';
import { UsersRepository } from '../users.repository';
import { hashPin } from '../utils';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    private readonly repository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    userId: string,
    dto: UpdateProfile,
  ): Promise<Pick<User, 'id' | 'name' | 'role'>> {
    if (dto.name !== undefined) {
      await this.ensureNameIsFree(dto.name, userId);
    }

    return this.repository.updateProfile(userId, {
      name: dto.name,
      pinHash: dto.pin
        ? await hashPin(
            dto.pin,
            Number(this.configService.getOrThrow('SALT_ROUND')),
          )
        : undefined,
    });
  }

  private async ensureNameIsFree(name: string, userId: string): Promise<void> {
    const existingUser = await this.repository.findByName(name);

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Esse nome já está em uso');
    }
  }
}

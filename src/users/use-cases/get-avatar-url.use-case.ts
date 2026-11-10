import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import { UsersRepository } from '../users.repository';

@Injectable()
export class GetAvatarUrlUseCase {
  constructor(
    private readonly repository: UsersRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(userId: string): Promise<{ url: string }> {
    const user = await this.repository.findById(userId);

    if (!user?.avatarPath) {
      throw new NotFoundException('Usuário não tem avatar');
    }

    const url = await this.storageService.getReadUrl(user.avatarPath);

    return { url };
  }
}

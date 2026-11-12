import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { MeRepository } from '../me.repository';

@Injectable()
export class GetAvatarUrlUseCase {
  constructor(
    private readonly repository: MeRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(id: string): Promise<{ url: string }> {
    const avatarPath = await this.repository.findAvatarUrl(id);

    if (!avatarPath) throw new NotFoundException('Usuário não tem avatar');

    const url = await this.storageService.getReadUrl(avatarPath);

    return { url };
  }
}

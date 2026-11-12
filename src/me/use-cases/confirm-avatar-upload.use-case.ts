import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { MeRepository } from '../me.repository';
import { buildAvatarPath } from '../utils';

@Injectable()
export class ConfirmAvatarUploadUseCase {
  constructor(
    private readonly repository: MeRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(userId: string): Promise<void> {
    const path = buildAvatarPath(userId);
    const exists = await this.storageService.exists(path);

    if (!exists) throw new NotFoundException('Upload do avatar não encontrado');

    await this.repository.updateAvatarPath(userId, path);
  }
}

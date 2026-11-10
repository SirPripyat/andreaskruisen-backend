import { Injectable } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import { buildAvatarPath } from '../utils';

@Injectable()
export class GetAvatarUploadUrlUseCase {
  constructor(private readonly storageService: StorageService) {}

  async execute(
    userId: string,
    contentType: string,
  ): Promise<{ uploadUrl: string }> {
    const path = buildAvatarPath(userId);
    const uploadUrl = await this.storageService.getUploadUrl(
      path,
      contentType,
    );

    return { uploadUrl };
  }
}

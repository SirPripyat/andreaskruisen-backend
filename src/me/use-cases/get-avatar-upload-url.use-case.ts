import { Injectable } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { AvatarUploadUrlResponseDTO } from '../dto';
import { buildAvatarPath } from '../utils';

@Injectable()
export class GetAvatarUploadUrlUseCase {
  constructor(private readonly storageService: StorageService) {}

  async execute(
    userId: string,
    contentType: string,
  ): Promise<AvatarUploadUrlResponseDTO> {
    const path = buildAvatarPath(userId);
    const uploadUrl = await this.storageService.getUploadUrl(path, contentType);

    return { uploadUrl };
  }
}

import type { Storage } from '@google-cloud/storage';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GCS_CLIENT } from './constants';

const WRITE_TIME_TO_EXPIRE = 10 * 60 * 1000; // means 10 min
const READ_TIME_TO_EXPIRE = 24 * 60 * 60 * 1000; // means 24 hrs

@Injectable()
export class StorageService {
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,

    @Inject(GCS_CLIENT)
    private readonly storage: Storage,
  ) {
    this.bucket = configService.getOrThrow('GCS_BUCKET');
  }

  async getUploadUrl(path: string, contentType: string): Promise<string> {
    const [url] = await this.storage
      .bucket(this.bucket)
      .file(path)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + WRITE_TIME_TO_EXPIRE,
        contentType,
      });

    return url;
  }

  async getReadUrl(path: string): Promise<string> {
    const [url] = await this.storage
      .bucket(this.bucket)
      .file(path)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + READ_TIME_TO_EXPIRE,
      });

    return url;
  }

  async exists(path: string): Promise<boolean> {
    const [exists] = await this.storage.bucket(this.bucket).file(path).exists();

    return exists;
  }
}

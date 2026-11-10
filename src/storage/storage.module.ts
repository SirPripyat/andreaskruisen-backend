import { Storage } from '@google-cloud/storage';
import { Module } from '@nestjs/common';
import { GCS_CLIENT } from './constants';
import { StorageService } from './storage.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    StorageService,
    {
      provide: GCS_CLIENT,
      useFactory: () => new Storage(),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}

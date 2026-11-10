import { Module } from '@nestjs/common';
import { NationalitiesRepository } from './nationalities.repository';

@Module({
  providers: [NationalitiesRepository],
  exports: [NationalitiesRepository],
})
export class NationalitiesModule {}

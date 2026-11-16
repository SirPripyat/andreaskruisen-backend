import { Module } from '@nestjs/common';
import { SpecialitiesRepository } from './specialities.repository';

@Module({
  providers: [SpecialitiesRepository],
  exports: [SpecialitiesRepository],
})
export class SpecialitiesModule {}

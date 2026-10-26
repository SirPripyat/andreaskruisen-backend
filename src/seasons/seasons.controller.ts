import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { CreateSeason, CreateSeasonSchema } from './dto/create-season.schema';
import { SeasonsService } from './seasons.service';

@Controller('seasons')
@UseGuards(SessionAuthGuard)
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  start(@Body(new ZodValidationPipe(CreateSeasonSchema)) dto: CreateSeason) {
    return this.seasonsService.start(dto);
  }
}

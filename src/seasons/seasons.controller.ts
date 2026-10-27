import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { CreateSeason, CreateSeasonSchema } from './dto/create-season.schema';
import { UpdateSeason, UpdateSeasonSchema } from './dto/update-season.schema';
import { SeasonsService } from './seasons.service';

@Controller('seasons')
@UseGuards(SessionAuthGuard)
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  start(@Body(new ZodValidationPipe(CreateSeasonSchema)) dto: CreateSeason) {
    return this.seasonsService.start(dto);
  }

  @Get()
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get('active')
  getActive() {
    return this.seasonsService.getActive();
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSeasonSchema)) dto: UpdateSeason,
  ) {
    return this.seasonsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.seasonsService.remove(id);
  }

  @Post(':id/select')
  select(@Param('id') id: string) {
    return this.seasonsService.selectActive(id);
  }
}

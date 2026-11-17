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
import {
  CreateSeasonRequestDTO,
  CreateSeasonSchema,
  UpdateSeasonRequestDTO,
  UpdateSeasonSchema,
} from './dto';
import { SeasonsFacade } from './seasons.facade';

@Controller('seasons')
@UseGuards(SessionAuthGuard)
export class SeasonsController {
  constructor(private readonly facade: SeasonsFacade) {}

  @Post()
  start(
    @Body(new ZodValidationPipe(CreateSeasonSchema))
    dto: CreateSeasonRequestDTO,
  ) {
    return this.facade.start(dto);
  }

  @Get()
  findAll() {
    return this.facade.findAll();
  }

  @Get('active')
  getActive() {
    return this.facade.getActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facade.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSeasonSchema))
    dto: UpdateSeasonRequestDTO,
  ) {
    return this.facade.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.facade.remove(id);
  }

  @Post(':id/select')
  select(@Param('id') id: string) {
    return this.facade.selectActive(id);
  }
}

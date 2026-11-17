import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  ListNationalitiesRequestDTO,
  ListNationalitiesSchema,
  UpdateNationalityRequestDTO,
  UpdateNationalitySchema,
} from './dto';
import { NationalitiesFacade } from './nationalities.facade';

@Controller('nationalities')
@UseGuards(SessionAuthGuard, AdminGuard)
export class NationalitiesController {
  constructor(private readonly facade: NationalitiesFacade) {}

  @Get()
  @UseGuards(AdminGuard)
  async list(
    @Query(new ZodValidationPipe(ListNationalitiesSchema))
    query: ListNationalitiesRequestDTO,
  ) {
    return this.facade.list(query);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async findOne(@Param('id') id: string) {
    return this.facade.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateNationalitySchema))
    dto: UpdateNationalityRequestDTO,
  ) {
    return this.facade.update(id, dto);
  }
}

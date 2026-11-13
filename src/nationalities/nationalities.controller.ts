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
  ListNationalitiesQuery,
  ListNationalitiesSchema,
} from './dto/list-nationalities.schema';
import {
  UpdateNationality,
  UpdateNationalitySchema,
} from './dto/update-nationality.schema';
import { NationalitiesService } from './nationalities.service';

@Controller('nationalities')
@UseGuards(SessionAuthGuard, AdminGuard)
export class NationalitiesController {
  constructor(private readonly nationalitiesService: NationalitiesService) {}

  @Get()
  @UseGuards(AdminGuard)
  async list(
    @Query(new ZodValidationPipe(ListNationalitiesSchema))
    query: ListNationalitiesQuery,
  ) {
    return this.nationalitiesService.list(query);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async findOne(@Param('id') id: string) {
    return this.nationalitiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateNationalitySchema))
    dto: UpdateNationality,
  ) {
    return this.nationalitiesService.update(id, dto);
  }
}

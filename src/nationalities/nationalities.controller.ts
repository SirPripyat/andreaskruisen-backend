import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
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
@Roles(UserRole.ADMIN)
@UseGuards(SessionAuthGuard, RolesGuard)
export class NationalitiesController {
  constructor(private readonly facade: NationalitiesFacade) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListNationalitiesSchema))
    query: ListNationalitiesRequestDTO,
  ) {
    return this.facade.list(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.facade.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateNationalitySchema))
    dto: UpdateNationalityRequestDTO,
  ) {
    return this.facade.update(id, dto);
  }
}

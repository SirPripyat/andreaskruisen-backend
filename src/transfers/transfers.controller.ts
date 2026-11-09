import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  SeasonContextGuard,
  SeasonScopedRequest,
} from '../seasons/season-context.guard';
import {
  CreateTransfer,
  CreateTransferSchema,
} from './dto/create-transfer.schema';
import { TransfersService } from './transfers.service';

@Controller('transfers')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(
    @Req() request: SeasonScopedRequest,
    @Body(new ZodValidationPipe(CreateTransferSchema)) dto: CreateTransfer,
  ) {
    return this.transfersService.create(request.seasonId, request.user.id, dto);
  }

  @Get()
  findBySeason(@Req() request: SeasonScopedRequest) {
    return this.transfersService.findBySeason(request.seasonId);
  }
}

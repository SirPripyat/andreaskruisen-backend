import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  SeasonContextGuard,
  SeasonScopedRequest,
} from '../seasons/season-context.guard';
import { CreateTransfer, CreateTransferSchema } from './dto';
import { CreateTransferUseCase, ListTransfersUseCase } from './use-cases';

@Controller('transfers')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class TransfersController {
  constructor(
    private readonly createTransferUseCase: CreateTransferUseCase,
    private readonly listTransfersUseCase: ListTransfersUseCase,
  ) {}

  @Post()
  create(
    @Req() request: SeasonScopedRequest,
    @Body(new ZodValidationPipe(CreateTransferSchema)) dto: CreateTransfer,
  ) {
    return this.createTransferUseCase.execute(
      request.seasonId,
      request.user.id,
      dto,
    );
  }

  @Get()
  findBySeason(@Req() request: SeasonScopedRequest) {
    return this.listTransfersUseCase.execute(request.seasonId);
  }
}

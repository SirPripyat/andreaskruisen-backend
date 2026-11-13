import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  SeasonContextGuard,
  SeasonScopedRequest,
} from '../seasons/season-context.guard';
import {
  CreateTransferRequestDTO,
  CreateTransferSchema,
  TransferPlayerMovementResponseDTO,
  TransferResponseDTO,
} from './dto';
import { TransfersFacade } from './transfers.facade';

@Controller('transfers')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class TransfersController {
  constructor(private readonly transfersFacade: TransfersFacade) {}

  @Post()
  create(
    @Req() request: SeasonScopedRequest,
    @Body(new ZodValidationPipe(CreateTransferSchema))
    dto: CreateTransferRequestDTO,
  ): Promise<TransferResponseDTO> {
    return this.transfersFacade.create(request.seasonId, request.user.id, dto);
  }

  @Get()
  findBySeason(
    @Req() request: SeasonScopedRequest,
  ): Promise<TransferPlayerMovementResponseDTO[]> {
    return this.transfersFacade.findBySeason(request.seasonId);
  }
}

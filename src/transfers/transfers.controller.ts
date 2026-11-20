import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  RequiredSeasonScopedRequest,
  SeasonContextGuard,
} from '../seasons/season-context.guard';
import {
  CreateTransferRequestDTO,
  CreateTransferSchema,
  QuoteTransferResponseDTO,
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
    @Req() request: RequiredSeasonScopedRequest,
    @Body(new ZodValidationPipe(CreateTransferSchema))
    dto: CreateTransferRequestDTO,
  ): Promise<TransferResponseDTO> {
    return this.transfersFacade.create(request.seasonId, request.user, dto);
  }

  @Get()
  findBySeason(
    @Req() request: RequiredSeasonScopedRequest,
  ): Promise<TransferPlayerMovementResponseDTO[]> {
    return this.transfersFacade.findBySeason(request.seasonId);
  }

  @Get('quote')
  quote(
    @Req() request: RequiredSeasonScopedRequest,
    @Query(new ZodValidationPipe(CreateTransferSchema))
    dto: CreateTransferRequestDTO,
  ): Promise<QuoteTransferResponseDTO> {
    return this.transfersFacade.quote(request.seasonId, request.user, dto);
  }
}

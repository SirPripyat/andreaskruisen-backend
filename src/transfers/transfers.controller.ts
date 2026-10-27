import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  SessionAuthGuard,
} from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  CreateTransfer,
  CreateTransferSchema,
} from './dto/create-transfer.schema';
import { TransfersService } from './transfers.service';

@Controller('seasons/:seasonId/transfers')
@UseGuards(SessionAuthGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('seasonId') seasonId: string,
    @Body(new ZodValidationPipe(CreateTransferSchema)) dto: CreateTransfer,
  ) {
    return this.transfersService.create(seasonId, request.user.id, dto);
  }

  @Get()
  findBySeason(@Param('seasonId') seasonId: string) {
    return this.transfersService.findBySeason(seasonId);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  RequiredSeasonScopedRequest,
  SeasonContextGuard,
} from '../seasons/season-context.guard';
import { ProposeNegotiationRequestDTO, ProposeNegotiationSchema } from './dto';
import { NegotiationResponseDTO } from './dto/response';
import { NegotiationsFacade } from './negotiations.facade';

@Controller('negotiations')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class NegotiationsController {
  constructor(private readonly negotiationsFacade: NegotiationsFacade) {}

  @Post()
  propose(
    @Req() request: RequiredSeasonScopedRequest,
    @Body(new ZodValidationPipe(ProposeNegotiationSchema))
    dto: ProposeNegotiationRequestDTO,
  ): Promise<NegotiationResponseDTO> {
    return this.negotiationsFacade.propose(
      request.seasonId,
      request.user.id,
      dto,
    );
  }

  @Get()
  listForSquad(
    @Req() request: RequiredSeasonScopedRequest,
  ): Promise<NegotiationResponseDTO[]> {
    return this.negotiationsFacade.listForSquad(
      request.seasonId,
      request.user.id,
    );
  }

  @Patch(':id/accept')
  accept(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('id') id: string,
  ): Promise<NegotiationResponseDTO> {
    return this.negotiationsFacade.accept(
      request.seasonId,
      request.user.id,
      id,
    );
  }

  @Patch(':id/reject')
  reject(
    @Req() request: RequiredSeasonScopedRequest,
    @Param('id') id: string,
  ): Promise<NegotiationResponseDTO> {
    return this.negotiationsFacade.reject(
      request.seasonId,
      request.user.id,
      id,
    );
  }
}

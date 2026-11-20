import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  RequiredSeasonScopedRequest,
  SeasonContextGuard,
} from '../seasons/season-context.guard';
import {
  NegotiationWindowIsOpenResponseDTO,
  NegotiationWindowResponseDTO,
  NegotiationWindowStatusResponseDTO,
  OpenNegotiationWindowRequestDTO,
  OpenNegotiationWindowSchema,
} from './dto';
import { NegotiationWindowFacade } from './negotiation-window.facade';

// Status (GET) é lido por qualquer participante autenticado — precisa
// saber se a janela está aberta antes de tentar criar uma transferência ou
// negociação. Só abrir/fechar é admin-only.
@Controller('negotiation-window')
@UseGuards(SessionAuthGuard, SeasonContextGuard)
export class NegotiationWindowController {
  constructor(private readonly facade: NegotiationWindowFacade) {}

  @Get()
  status(
    @Req() request: RequiredSeasonScopedRequest,
  ): Promise<NegotiationWindowStatusResponseDTO> {
    return this.facade.status(request.seasonId);
  }

  @Get('is-open')
  isOpen(
    @Req() request: RequiredSeasonScopedRequest,
  ): Promise<NegotiationWindowIsOpenResponseDTO> {
    return this.facade.isOpen(request.seasonId);
  }

  @Post('open')
  @UseGuards(AdminGuard)
  open(
    @Req() request: RequiredSeasonScopedRequest,
    @Body(new ZodValidationPipe(OpenNegotiationWindowSchema))
    dto: OpenNegotiationWindowRequestDTO,
  ): Promise<NegotiationWindowResponseDTO> {
    return this.facade.open(request.seasonId, request.user.id, dto);
  }

  @Post('close')
  @UseGuards(AdminGuard)
  close(
    @Req() request: RequiredSeasonScopedRequest,
  ): Promise<NegotiationWindowResponseDTO> {
    return this.facade.close(request.seasonId, request.user.id);
  }
}

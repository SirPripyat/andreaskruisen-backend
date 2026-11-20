import { Injectable } from '@nestjs/common';
import { OpenNegotiationWindowRequestDTO } from './dto/request';
import {
  NegotiationWindowIsOpenResponseDTO,
  NegotiationWindowResponseDTO,
  NegotiationWindowStatusResponseDTO,
} from './dto/response';
import {
  CheckNegotiationWindowIsOpenUseCase,
  CloseNegotiationWindowUseCase,
  GetNegotiationWindowStatusUseCase,
  OpenNegotiationWindowUseCase,
} from './use-cases';

@Injectable()
export class NegotiationWindowFacade {
  constructor(
    private readonly getNegotiationWindowStatusUseCase: GetNegotiationWindowStatusUseCase,
    private readonly checkNegotiationWindowIsOpenUseCase: CheckNegotiationWindowIsOpenUseCase,
    private readonly openNegotiationWindowUseCase: OpenNegotiationWindowUseCase,
    private readonly closeNegotiationWindowUseCase: CloseNegotiationWindowUseCase,
  ) {}

  status(seasonId: string): Promise<NegotiationWindowStatusResponseDTO> {
    return this.getNegotiationWindowStatusUseCase.execute(seasonId);
  }

  isOpen(seasonId: string): Promise<NegotiationWindowIsOpenResponseDTO> {
    return this.checkNegotiationWindowIsOpenUseCase.execute(seasonId);
  }

  open(
    seasonId: string,
    userId: string,
    dto: OpenNegotiationWindowRequestDTO,
  ): Promise<NegotiationWindowResponseDTO> {
    return this.openNegotiationWindowUseCase.execute(seasonId, userId, dto);
  }

  close(
    seasonId: string,
    userId: string,
  ): Promise<NegotiationWindowResponseDTO> {
    return this.closeNegotiationWindowUseCase.execute(seasonId, userId);
  }
}

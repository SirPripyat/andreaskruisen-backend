import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { NegotiationWindowController } from './negotiation-window.controller';
import { NegotiationWindowFacade } from './negotiation-window.facade';
import { NegotiationWindowRepository } from './negotiation-window.repository';
import {
  CheckNegotiationWindowIsOpenUseCase,
  CloseNegotiationWindowUseCase,
  GetNegotiationWindowStatusUseCase,
  GetOpenNegotiationWindowUseCase,
  OpenNegotiationWindowUseCase,
} from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule],
  controllers: [NegotiationWindowController],
  providers: [
    NegotiationWindowRepository,
    NegotiationWindowFacade,
    GetNegotiationWindowStatusUseCase,
    CheckNegotiationWindowIsOpenUseCase,
    OpenNegotiationWindowUseCase,
    CloseNegotiationWindowUseCase,
    GetOpenNegotiationWindowUseCase,
  ],
  exports: [GetOpenNegotiationWindowUseCase],
})
export class NegotiationWindowModule {}

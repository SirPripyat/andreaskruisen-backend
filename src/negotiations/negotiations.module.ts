import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NegotiationWindowModule } from '../negotiation-window/negotiation-window.module';
import { RulesetsModule } from '../rulesets/rulesets.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsModule } from '../squads/squads.module';
import { TransfersModule } from '../transfers/transfers.module';
import { NegotiationsController } from './negotiations.controller';
import { NegotiationsFacade } from './negotiations.facade';
import { NegotiationsRepository } from './negotiations.repository';
import {
  AcceptNegotiationUseCase,
  ListNegotiationsUseCase,
  ProposeNegotiationUseCase,
  RejectNegotiationUseCase,
} from './use-cases';

@Module({
  imports: [
    AuthModule,
    SeasonsModule,
    SquadsModule,
    RulesetsModule,
    NegotiationWindowModule,
    // Negociação aceita grava o Transfer gerado via TransfersRepository.record
    // (ver AcceptNegotiationUseCase) — a movimentação é a mesma "tabela de
    // fato" do mercado tradicional, quem muda é só a origem.
    TransfersModule,
  ],
  controllers: [NegotiationsController],
  providers: [
    NegotiationsRepository,
    NegotiationsFacade,
    ProposeNegotiationUseCase,
    AcceptNegotiationUseCase,
    RejectNegotiationUseCase,
    ListNegotiationsUseCase,
  ],
})
export class NegotiationsModule {}

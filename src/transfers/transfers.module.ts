import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NegotiationWindowModule } from '../negotiation-window/negotiation-window.module';
import { RulesetsModule } from '../rulesets/rulesets.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsModule } from '../squads/squads.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { UsersModule } from '../users/users.module';
import { TransfersController } from './transfers.controller';
import { TransfersFacade } from './transfers.facade';
import { TransfersRepository } from './transfers.repository';
import {
  CreateTransferUseCase,
  ListTransfersUseCase,
  QuoteTransferUseCase,
  ResolveTransferUseCase,
} from './use-cases';

@Module({
  imports: [
    AuthModule,
    SeasonsModule,
    SquadsModule,
    TournamentsModule,
    RulesetsModule,
    NegotiationWindowModule,
    UsersModule,
  ],
  controllers: [TransfersController],
  providers: [
    TransfersRepository,
    TransfersFacade,
    CreateTransferUseCase,
    ListTransfersUseCase,
    QuoteTransferUseCase,
    ResolveTransferUseCase,
  ],
  // NegotiationsModule injeta TransfersRepository para gravar o Transfer
  // gerado no aceite de uma negociação direta (ver AcceptNegotiationUseCase)
  // — a movimentação é a mesma "tabela de fato", quem muda é só a origem.
  exports: [TransfersRepository],
})
export class TransfersModule {}

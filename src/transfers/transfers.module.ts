import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { SquadsModule } from '../squads/squads.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TransfersController } from './transfers.controller';
import { TransfersFacade } from './transfers.facade';
import { TransfersRepository } from './transfers.repository';
import { CreateTransferUseCase, ListTransfersUseCase } from './use-cases';

@Module({
  imports: [AuthModule, SeasonsModule, SquadsModule, TournamentsModule],
  controllers: [TransfersController],
  providers: [
    TransfersRepository,
    TransfersFacade,
    CreateTransferUseCase,
    ListTransfersUseCase,
  ],
})
export class TransfersModule {}

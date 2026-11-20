import { Injectable, NotFoundException } from '@nestjs/common';
import { ListSquadCoinTransactionsResponseDTO } from '../dto';
import { SquadsRepository } from '../squads.repository';

@Injectable()
export class ListSquadCoinTransactionsUseCase {
  constructor(private readonly squadsRepository: SquadsRepository) {}

  async execute(
    seasonId: string,
    teamId: string,
  ): Promise<ListSquadCoinTransactionsResponseDTO> {
    const squad = await this.squadsRepository.findByTeamAndSeason(
      teamId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException('Esse time não tem elenco nessa temporada');

    return this.squadsRepository.findCoinTransactions(squad.id, teamId);
  }
}

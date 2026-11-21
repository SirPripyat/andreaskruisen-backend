import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SimulateMatchesBulkResponseDTO } from '../dto';
import { MatchesRepository } from '../matches.repository';
import { SimulateMatchUseCase } from './simulate-match.use-case';

@Injectable()
export class SimulateMatchesBulkUseCase {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly simulateMatchUseCase: SimulateMatchUseCase,
  ) {}

  @Transactional()
  async execute(matchIds: string[]): Promise<SimulateMatchesBulkResponseDTO> {
    const ids = [...new Set(matchIds)];

    const matches = await this.matchesRepository.findManyForBulkSimulation(ids);

    if (matches.length !== ids.length)
      throw new NotFoundException('Alguma partida não foi encontrada');

    const tournamentId = matches[0].tournamentId;
    if (matches.some((match) => match.tournamentId !== tournamentId))
      throw new BadRequestException('Partidas de torneios diferentes');

    const skipped = matches
      .filter((match) => match.playedAt !== null)
      .map((match) => ({
        matchId: match.id,
        reason: 'Partida já tem resultado registrado',
      }));

    const pending = matches.filter((match) => match.playedAt === null);

    const simulatedMatchIds: string[] = [];
    for (const match of pending) {
      await this.simulateMatchUseCase.simulateCore(match.id);
      simulatedMatchIds.push(match.id);
    }

    return { tournamentId, simulatedMatchIds, skipped };
  }
}

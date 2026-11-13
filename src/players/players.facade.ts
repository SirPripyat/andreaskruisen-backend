import { Injectable } from '@nestjs/common';
import {
  GetPlayerResponseDTO,
  GetSimilarPlayersResponseDTO,
  ListPlayersForSeasonResponseDTO,
  ListPlayersRequestDTO,
  ListPlayersResponseDTO,
} from './dto';
import {
  GetPlayerUseCase,
  GetSimilarPlayersUseCase,
  ListPlayersForSeasonUseCase,
  ListPlayersUseCase,
} from './use-cases';

@Injectable()
export class PlayersFacade {
  constructor(
    private readonly listPlayersUseCase: ListPlayersUseCase,
    private readonly listPlayersForSeasonUseCase: ListPlayersForSeasonUseCase,
    private readonly getPlayerUseCase: GetPlayerUseCase,
    private readonly getSimilarPlayersUseCase: GetSimilarPlayersUseCase,
  ) {}

  list(query: ListPlayersRequestDTO): Promise<ListPlayersResponseDTO> {
    return this.listPlayersUseCase.execute(query);
  }

  listForSeason(
    seasonId: string,
    userId: string,
    query: ListPlayersRequestDTO,
  ): Promise<ListPlayersForSeasonResponseDTO> {
    return this.listPlayersForSeasonUseCase.execute(seasonId, userId, query);
  }

  getOne(
    seasonId: string,
    userId: string,
    id: string,
  ): Promise<GetPlayerResponseDTO> {
    return this.getPlayerUseCase.execute(seasonId, userId, id);
  }

  getSimilar(
    seasonId: string,
    id: string,
    limit: number,
  ): Promise<GetSimilarPlayersResponseDTO> {
    return this.getSimilarPlayersUseCase.execute(seasonId, id, limit);
  }
}

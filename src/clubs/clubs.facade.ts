import { Injectable } from '@nestjs/common';
import {
  GetClubResponseDTO,
  GetClubTitlesResponseDTO,
  ListClubsRequestDTO,
  ListClubsResponseDTO,
} from './dto';
import {
  GetClubTitlesUseCase,
  GetClubUseCase,
  ListClubsUseCase,
} from './use-cases';

@Injectable()
export class ClubsFacade {
  constructor(
    private readonly listClubsUseCase: ListClubsUseCase,
    private readonly getClubUseCase: GetClubUseCase,
    private readonly getClubTitlesUseCase: GetClubTitlesUseCase,
  ) {}

  list(
    query: ListClubsRequestDTO,
    seasonId: string,
  ): Promise<ListClubsResponseDTO> {
    return this.listClubsUseCase.execute(query, seasonId);
  }

  getOne(id: string, seasonId: string): Promise<GetClubResponseDTO> {
    return this.getClubUseCase.execute(id, seasonId);
  }

  getTitles(id: string, seasonId: string): Promise<GetClubTitlesResponseDTO> {
    return this.getClubTitlesUseCase.execute(id, seasonId);
  }
}

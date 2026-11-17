import { Injectable } from '@nestjs/common';
import {
  GetTeamResponseDTO,
  GetTeamTitlesResponseDTO,
  ListTeamsRequestDTO,
  ListTeamsResponseDTO,
  UpdateTeamRequestDTO,
  UpdateTeamResponseDTO,
} from './dto';
import {
  GetTeamTitlesUseCase,
  GetTeamUseCase,
  ListTeamsUseCase,
  UpdateTeamUseCase,
} from './use-cases';

@Injectable()
export class TeamsFacade {
  constructor(
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly getTeamUseCase: GetTeamUseCase,
    private readonly getTeamTitlesUseCase: GetTeamTitlesUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
  ) {}

  list(query: ListTeamsRequestDTO): Promise<ListTeamsResponseDTO> {
    return this.listTeamsUseCase.execute(query);
  }

  getOne(id: string, seasonId: string): Promise<GetTeamResponseDTO> {
    return this.getTeamUseCase.execute(id, seasonId);
  }

  getTitles(id: string): Promise<GetTeamTitlesResponseDTO> {
    return this.getTeamTitlesUseCase.execute(id);
  }

  update(
    id: string,
    dto: UpdateTeamRequestDTO,
    seasonId: string,
  ): Promise<UpdateTeamResponseDTO> {
    return this.updateTeamUseCase.execute(id, dto, seasonId);
  }
}

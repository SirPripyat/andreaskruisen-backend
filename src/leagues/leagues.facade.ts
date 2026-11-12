import { Injectable } from '@nestjs/common';
import {
  FindLeagueResponseDTO,
  ListLeaguesRequestDTO,
  ListLeaguesResponseDTO,
  UpdateLeagueRequestDTO,
  UpdateLeagueResponseDTO,
} from './dto';
import {
  FindLeagueUseCase,
  ListLeaguesUseCase,
  UpdateLeagueUseCase,
} from './use-cases';

@Injectable()
export class LeaguesFacade {
  constructor(
    private readonly listLeaguesUseCase: ListLeaguesUseCase,
    private readonly findLeagueUseCase: FindLeagueUseCase,
    private readonly updateLeagueUseCase: UpdateLeagueUseCase,
  ) {}

  list(query: ListLeaguesRequestDTO): Promise<ListLeaguesResponseDTO> {
    return this.listLeaguesUseCase.execute(query);
  }

  find(id: string): Promise<FindLeagueResponseDTO> {
    return this.findLeagueUseCase.execute(id);
  }

  update(
    id: string,
    dto: UpdateLeagueRequestDTO,
  ): Promise<UpdateLeagueResponseDTO> {
    return this.updateLeagueUseCase.execute(id, dto);
  }
}

import { Injectable } from '@nestjs/common';
import {
  CreateSeasonRequestDTO,
  FindSeasonResponseDTO,
  GetActiveSeasonResponseDTO,
  ListSeasonsResponseDTO,
  SelectActiveSeasonResponseDTO,
  StartSeasonResponseDTO,
  UpdateSeasonRequestDTO,
  UpdateSeasonResponseDTO,
} from './dto';
import {
  FindSeasonUseCase,
  GetActiveSeasonUseCase,
  ListSeasonsUseCase,
  RemoveSeasonUseCase,
  SelectActiveSeasonUseCase,
  StartSeasonUseCase,
  UpdateSeasonUseCase,
} from './use-cases';

@Injectable()
export class SeasonsFacade {
  constructor(
    private readonly startSeasonUseCase: StartSeasonUseCase,
    private readonly listSeasonsUseCase: ListSeasonsUseCase,
    private readonly getActiveSeasonUseCase: GetActiveSeasonUseCase,
    private readonly findSeasonUseCase: FindSeasonUseCase,
    private readonly updateSeasonUseCase: UpdateSeasonUseCase,
    private readonly removeSeasonUseCase: RemoveSeasonUseCase,
    private readonly selectActiveSeasonUseCase: SelectActiveSeasonUseCase,
  ) {}

  start(dto: CreateSeasonRequestDTO): Promise<StartSeasonResponseDTO> {
    return this.startSeasonUseCase.execute(dto);
  }

  findAll(): Promise<ListSeasonsResponseDTO> {
    return this.listSeasonsUseCase.execute();
  }

  getActive(): Promise<GetActiveSeasonResponseDTO> {
    return this.getActiveSeasonUseCase.execute();
  }

  findOne(id: string): Promise<FindSeasonResponseDTO> {
    return this.findSeasonUseCase.execute(id);
  }

  update(
    id: string,
    dto: UpdateSeasonRequestDTO,
  ): Promise<UpdateSeasonResponseDTO> {
    return this.updateSeasonUseCase.execute(id, dto);
  }

  remove(id: string): Promise<void> {
    return this.removeSeasonUseCase.execute(id);
  }

  selectActive(id: string): Promise<SelectActiveSeasonResponseDTO> {
    return this.selectActiveSeasonUseCase.execute(id);
  }
}

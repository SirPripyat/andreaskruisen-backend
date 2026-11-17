import { Injectable } from '@nestjs/common';
import {
  GetNationalityResponseDTO,
  ListNationalitiesRequestDTO,
  ListNationalitiesResponseDTO,
  UpdateNationalityRequestDTO,
  UpdateNationalityResponseDTO,
} from './dto';
import {
  GetNationalityUseCase,
  ListNationalitiesUseCase,
  UpdateNationalityUseCase,
} from './use-cases';

@Injectable()
export class NationalitiesFacade {
  constructor(
    private readonly listNationalitiesUseCase: ListNationalitiesUseCase,
    private readonly getNationalityUseCase: GetNationalityUseCase,
    private readonly updateNationalityUseCase: UpdateNationalityUseCase,
  ) {}

  list(
    query: ListNationalitiesRequestDTO,
  ): Promise<ListNationalitiesResponseDTO> {
    return this.listNationalitiesUseCase.execute(query);
  }

  findOne(id: string): Promise<GetNationalityResponseDTO> {
    return this.getNationalityUseCase.execute(id);
  }

  update(
    id: string,
    dto: UpdateNationalityRequestDTO,
  ): Promise<UpdateNationalityResponseDTO> {
    return this.updateNationalityUseCase.execute(id, dto);
  }
}

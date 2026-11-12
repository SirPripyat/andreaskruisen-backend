import { Injectable } from '@nestjs/common';
import { ActiveSeasonResponseDTO } from '../dto';
import { MeRepository } from '../me.repository';

@Injectable()
export class GetMyActiveSeasonUseCase {
  constructor(private readonly repository: MeRepository) {}

  execute(id: string): Promise<ActiveSeasonResponseDTO> {
    return this.repository.findSelectedSeason(id);
  }
}

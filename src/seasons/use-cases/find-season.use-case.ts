import { Injectable } from '@nestjs/common';
import { FindSeasonResponseDTO } from '../dto/response';
import { FindSeasonOrThrowUseCase } from './find-season-or-throw.use-case';

@Injectable()
export class FindSeasonUseCase {
  constructor(
    private readonly findSeasonOrThrowUseCase: FindSeasonOrThrowUseCase,
  ) {}

  execute(id: string): Promise<FindSeasonResponseDTO> {
    return this.findSeasonOrThrowUseCase.execute(id);
  }
}

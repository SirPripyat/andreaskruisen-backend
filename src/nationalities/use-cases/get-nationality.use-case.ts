import { Injectable } from '@nestjs/common';
import { GetNationalityResponseDTO } from '../dto/response';
import { FindNationalityOrThrowUseCase } from './find-nationality-or-throw.use-case';

@Injectable()
export class GetNationalityUseCase {
  constructor(
    private readonly findNationalityOrThrowUseCase: FindNationalityOrThrowUseCase,
  ) {}

  execute(id: string): Promise<GetNationalityResponseDTO> {
    return this.findNationalityOrThrowUseCase.execute(id);
  }
}

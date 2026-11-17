import { Injectable, NotFoundException } from '@nestjs/common';
import { Nationality } from '../../../generated/prisma/client';
import { NationalitiesRepository } from '../nationalities.repository';

@Injectable()
export class FindNationalityOrThrowUseCase {
  constructor(
    private readonly nationalitiesRepository: NationalitiesRepository,
  ) {}

  async execute(id: string): Promise<Nationality> {
    const nationality = await this.nationalitiesRepository.findById(id);
    if (!nationality) {
      throw new NotFoundException('Nacionalidade não encontrada');
    }
    return nationality;
  }
}

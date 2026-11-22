import { Injectable, NotFoundException } from '@nestjs/common';
import { ClubsRepository } from '../clubs.repository';
import { ClubWithRatings } from '../types';

@Injectable()
export class FindClubOrThrowUseCase {
  constructor(private readonly clubsRepository: ClubsRepository) {}

  async execute(id: string, seasonId: string): Promise<ClubWithRatings> {
    const club = await this.clubsRepository.findById(id, seasonId);
    if (!club) {
      throw new NotFoundException('Clube não encontrado');
    }
    return club;
  }
}

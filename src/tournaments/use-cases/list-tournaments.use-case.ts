import { Injectable } from '@nestjs/common';
import { Tournament } from '../../../generated/prisma/client';
import { TournamentsRepository } from '../tournaments.repository';

@Injectable()
export class ListTournamentsUseCase {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  execute(seasonId: string): Promise<Tournament[]> {
    return this.tournamentsRepository.findBySeason(seasonId);
  }
}

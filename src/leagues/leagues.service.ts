import { Injectable } from '@nestjs/common';
import { League } from '../../generated/prisma/client';
import { LeaguesRepository } from './leagues.repository';

@Injectable()
export class LeaguesService {
  constructor(private readonly leaguesRepository: LeaguesRepository) {}

  findAll(): Promise<League[]> {
    return this.leaguesRepository.findAll();
  }
}

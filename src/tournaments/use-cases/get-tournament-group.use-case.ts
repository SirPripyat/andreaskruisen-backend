import { Injectable, NotFoundException } from '@nestjs/common';
import { GetTournamentGroupRequestDTO } from '../dto/request';
import { TournamentsRepository } from '../tournaments.repository';
import { TournamentGroupSituation } from '../types';
import { BuildGroupStandingsUseCase } from './build-group-standings.use-case';
import { FindTournamentOrThrowUseCase } from './find-tournament-or-throw.use-case';

@Injectable()
export class GetTournamentGroupUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
  ) {}

  async execute(
    tournamentId: string,
    groupLabel: string,
    query: GetTournamentGroupRequestDTO,
  ): Promise<TournamentGroupSituation> {
    const [tournament, phase] = await Promise.all([
      this.findTournamentOrThrowUseCase.execute(tournamentId),
      query.round
        ? this.tournamentsRepository.findPhaseByOrder(tournamentId, query.round)
        : this.tournamentsRepository.findLatestPhase(tournamentId),
    ]);

    if (!phase) {
      throw new NotFoundException(
        query.round
          ? 'Rodada não encontrada'
          : 'Torneio ainda não tem fase gerada',
      );
    }

    if (phase.type === 'KNOCKOUT')
      throw new NotFoundException('Fase não tem grupos');

    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      phase.id,
      groupLabel,
    );

    if (groupMatches.length === 0)
      throw new NotFoundException('Grupo não encontrado');

    const [standingsByGroup, ownerByTeamId] = await Promise.all([
      this.buildGroupStandingsUseCase.execute(groupMatches),
      this.tournamentsRepository.findOwnersByTeamIds(
        [...new Set(groupMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))],
        tournament.seasonId,
      ),
    ]);

    const standings = standingsByGroup[groupLabel].map((standing) => ({
      ...standing,
      owner: ownerByTeamId.get(standing.teamId) ?? null,
    }));

    return { phase, groupLabel, standings };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { TournamentsRepository } from '../../tournaments/tournaments.repository';
import { FindTournamentOrThrowUseCase } from '../../tournaments/use-cases/find-tournament-or-throw.use-case';
import { toMatchListItem } from '../../tournaments/utils';
import { ListMatchesRequestDTO } from '../dto/request';
import { MatchesRepository } from '../matches.repository';
import { MatchesPage } from '../types';

@Injectable()
export class ListTournamentMatchesUseCase {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly findTournamentOrThrowUseCase: FindTournamentOrThrowUseCase,
  ) {}

  async execute(query: ListMatchesRequestDTO): Promise<MatchesPage> {
    const { tournamentId } = query;

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

    const [result, hasLaterPhase] = await Promise.all([
      this.matchesRepository.findPaginatedMatches(phase.id, query),
      this.tournamentsRepository.hasLaterPhase(tournamentId, phase.order),
    ]);
    const locked = hasLaterPhase || tournament.finishedAt !== null;

    const ownerByTeamId = await this.tournamentsRepository.findOwnersByTeamIds(
      [...new Set(result.data.flatMap((m) => [m.homeTeam.id, m.awayTeam.id]))],
      tournament.seasonId,
    );

    return {
      phase,
      ...result,
      data: result.data.map((match) =>
        toMatchListItem(match, locked, ownerByTeamId),
      ),
    };
  }
}

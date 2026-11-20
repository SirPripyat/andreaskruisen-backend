import { Injectable, NotFoundException } from '@nestjs/common';
import { Tournament } from '../../../generated/prisma/client';
import { SquadsRepository } from '../../squads/squads.repository';
import { TournamentsRepository } from '../tournaments.repository';
import {
  MatchWithTeams,
  MyStanding,
  MyTournamentSummary,
  PhaseSummary,
} from '../types';
import { BuildGroupStandingsUseCase } from './build-group-standings.use-case';

// Torneios em que o meu time tem squad, com minha posição na fase atual e
// meu próximo confronto já resolvidos — pro card de torneios do dashboard
// (ver ListMyTournamentsUseCase, GetTournamentDashboardUseCase pro
// equivalente "qualquer time com dono" dentro de um único torneio).
@Injectable()
export class ListMyTournamentsUseCase {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly squadsRepository: SquadsRepository,
    private readonly buildGroupStandingsUseCase: BuildGroupStandingsUseCase,
  ) {}

  async execute(
    seasonId: string,
    userId: string,
  ): Promise<MyTournamentSummary[]> {
    const squad = await this.squadsRepository.findByUserAndSeason(
      userId,
      seasonId,
    );

    if (!squad)
      throw new NotFoundException(
        'Você ainda não escolheu um time nessa temporada',
      );

    const tournaments = await this.tournamentsRepository.findByTeamAndSeason(
      seasonId,
      squad.teamId,
    );

    return Promise.all(
      tournaments.map((tournament) =>
        this.buildSummary(tournament, squad.teamId),
      ),
    );
  }

  private async buildSummary(
    tournament: Tournament,
    teamId: string,
  ): Promise<MyTournamentSummary> {
    const currentPhase = await this.tournamentsRepository.findLatestPhase(
      tournament.id,
    );

    const [myStanding, nextMatch] = await Promise.all([
      this.getMyStanding(currentPhase, teamId),
      this.getNextMatch(currentPhase, teamId),
    ]);

    return {
      id: tournament.id,
      seasonId: tournament.seasonId,
      name: tournament.name,
      format: tournament.format,
      maxTeams: tournament.maxTeams,
      createdAt: tournament.createdAt,
      currentPhase,
      myStanding,
      nextMatch,
    };
  }

  private async getMyStanding(
    phase: PhaseSummary | null,
    teamId: string,
  ): Promise<MyStanding | null> {
    if (!phase || phase.type === 'KNOCKOUT') return null;

    const groupMatches = await this.tournamentsRepository.findGroupMatches(
      phase.id,
    );
    const standingsByGroup =
      await this.buildGroupStandingsUseCase.execute(groupMatches);

    for (const standings of Object.values(standingsByGroup)) {
      const mine = standings.find((standing) => standing.teamId === teamId);
      if (mine) {
        return {
          position: mine.position,
          points: mine.points,
          goalDifference: mine.goalDifference,
          last5: mine.last5,
        };
      }
    }

    return null;
  }

  private async getNextMatch(
    phase: PhaseSummary | null,
    teamId: string,
  ): Promise<MyTournamentSummary['nextMatch']> {
    if (!phase) return null;

    const matches = await this.tournamentsRepository.findMatchesByPhase(
      phase.id,
    );
    const next = matches.find(
      (match) =>
        match.playedAt === null &&
        (match.homeTeam.id === teamId || match.awayTeam.id === teamId),
    );

    return next ? this.toNextMatch(next, phase.name) : null;
  }

  private toNextMatch(
    match: MatchWithTeams,
    phaseName: string,
  ): NonNullable<MyTournamentSummary['nextMatch']> {
    return {
      id: match.id,
      phaseName,
      groupLabel: match.groupLabel,
      round: match.round,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    };
  }
}

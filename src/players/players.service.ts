import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../commons/pagination';
import { ListPlayersQuery } from './dto/list-players.schema';
import { PlayersRepository } from './players.repository';
import { PlayerDetail, PlayerListItem } from './types';

@Injectable()
export class PlayersService {
  constructor(private readonly playersRepository: PlayersRepository) {}

  async getOne(seasonId: string, id: string): Promise<PlayerDetail> {
    const player = await this.playersRepository.findByIdForSeason(seasonId, id);
    const assignment = player?.seasonAssignments[0];
    if (!player || !assignment) {
      throw new NotFoundException('Jogador não encontrado nessa temporada');
    }

    const latestRatingRow = player.ratings[0];
    let latestRating = null;
    if (latestRatingRow) {
      const { id: _id, playerId: _playerId, ...rating } = latestRatingRow;
      latestRating = rating;
    }

    return {
      id: player.id,
      eaId: player.eaId,
      name: player.name,
      photoUrl: player.photoUrl,
      birthdate: player.birthdate,
      preferredFoot: player.preferredFoot,
      team: {
        id: assignment.team.id,
        name: assignment.team.name,
        crestUrl: assignment.team.crestUrl,
      },
      nationality: {
        id: player.nationality.id,
        name: player.nationality.name,
        flagUrl: player.nationality.flagUrl,
      },
      positions: player.positions.map((position) => ({
        position: position.position,
        isPrimary: position.isPrimary,
      })),
      latestRating,
      stats: {
        goalsScored: player._count.goalsScored,
        goalsAssisted: player._count.goalsAssisted,
      },
    };
  }

  async list(
    query: ListPlayersQuery,
  ): Promise<PaginatedResult<PlayerListItem>> {
    const result = await this.playersRepository.findPaginated(
      { name: query.name },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );

    return {
      ...result,
      data: result.data.map((player) => this.toListItem(player, player.team)),
    };
  }

  async listForSeason(
    seasonId: string,
    query: ListPlayersQuery,
  ): Promise<PaginatedResult<PlayerListItem>> {
    const result = await this.playersRepository.findPaginatedForSeason(
      seasonId,
      { name: query.name },
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      query,
    );

    return {
      ...result,
      data: result.data.map((assignment) =>
        this.toListItem(assignment.player, assignment.team),
      ),
    };
  }

  private toListItem(
    player: {
      id: string;
      eaId: number;
      name: string;
      photoUrl: string;
      birthdate: Date;
      preferredFoot: string;
      nationality: { id: string; name: string; flagUrl: string };
      positions: { position: string; isPrimary: boolean }[];
      ratings: { overallRating: number; capturedAt: Date }[];
    },
    team: { id: string; name: string; crestUrl: string },
  ): PlayerListItem {
    return {
      id: player.id,
      eaId: player.eaId,
      name: player.name,
      photoUrl: player.photoUrl,
      birthdate: player.birthdate,
      preferredFoot: player.preferredFoot,
      team: { id: team.id, name: team.name, crestUrl: team.crestUrl },
      nationality: {
        id: player.nationality.id,
        name: player.nationality.name,
        flagUrl: player.nationality.flagUrl,
      },
      positions: player.positions.map((position) => ({
        position: position.position,
        isPrimary: position.isPrimary,
      })),
      latestRating: player.ratings[0]
        ? {
            overallRating: player.ratings[0].overallRating,
            capturedAt: player.ratings[0].capturedAt,
          }
        : null,
    };
  }
}

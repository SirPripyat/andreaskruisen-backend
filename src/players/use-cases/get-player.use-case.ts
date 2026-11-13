import { Injectable, NotFoundException } from '@nestjs/common';
import { GetPlayerResponseDTO } from '../dto';
import { PlayersRepository } from '../players.repository';

@Injectable()
export class GetPlayerUseCase {
  constructor(private readonly playersRepository: PlayersRepository) {}

  async execute(
    seasonId: string,
    userId: string,
    id: string,
  ): Promise<GetPlayerResponseDTO> {
    const player = await this.playersRepository.findByIdForSeason(
      seasonId,
      userId,
      id,
    );
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
      isFavorite: player.favoritedBy.length > 0,
    };
  }
}

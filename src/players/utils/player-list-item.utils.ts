import { PlayerListItem } from '../types';

export const toPlayerListItem = (
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
): PlayerListItem => ({
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
});

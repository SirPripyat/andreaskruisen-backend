import { Squad } from 'generated/prisma/client';
import { RosterPlayer } from 'src/squads/types';

export type GetMySquadResponseDTO = { squad: Squad; players: RosterPlayer[] };

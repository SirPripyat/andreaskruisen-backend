import { TeamStats } from '../../../teams/types';
import { ClubWithRatings } from '../../types';

export type GetClubResponseDTO = ClubWithRatings & TeamStats;

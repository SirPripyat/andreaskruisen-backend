import { PaginatedResult } from '../../../commons/pagination';
import { ClubWithRatings } from '../../types';

export type ListClubsResponseDTO = PaginatedResult<ClubWithRatings>;

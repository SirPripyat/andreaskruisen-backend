import { PaginatedResult } from '../../../commons/pagination';
import { TeamWithRatings } from '../../types';

export type ListTeamsResponseDTO = PaginatedResult<TeamWithRatings>;

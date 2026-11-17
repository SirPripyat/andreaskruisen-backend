import { AuthenticatedUser } from 'src/auth/types';

export type GetMeResponseDTO = AuthenticatedUser & {
  seasonId: string | null;
  teamId: string | null;
};

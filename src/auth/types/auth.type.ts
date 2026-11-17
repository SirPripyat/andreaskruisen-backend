import { UserRole } from '../../../generated/prisma/client';

export type AuthenticatedUser = {
  id: string;
  name: string;
  role: UserRole;
  selectedSeasonId: string | null;
};

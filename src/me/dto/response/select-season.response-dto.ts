import { User } from '../../../../generated/prisma/client';

export type SelectSeasonResponseDTO = Pick<
  User,
  'id' | 'name' | 'role' | 'avatarPath' | 'selectedSeasonId'
>;

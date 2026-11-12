import { User } from '../../../../generated/prisma/client';

export type UserSummaryResponse = Pick<
  User,
  'id' | 'name' | 'role' | 'avatarPath'
>;

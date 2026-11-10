import { z } from 'zod';

export const UploadAvatarSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type UploadAvatar = z.infer<typeof UploadAvatarSchema>;

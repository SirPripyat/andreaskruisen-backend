import { z } from 'zod';

export const UploadAvatarUrlSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type UploadAvatarUrlRequestDTO = z.infer<typeof UploadAvatarUrlSchema>;

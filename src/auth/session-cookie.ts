import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'sessionId';

const isProduction = process.env.NODE_ENV === 'production';

export const sessionCookieOptions = (expiresAt?: Date): CookieOptions => ({
  httpOnly: true,
  // Front-end (Firebase Hosting) e back-end (nip.io) são domínios diferentes em
  // produção, então o cookie precisa de SameSite=None para ser enviado em
  // requisições cross-site. None exige Secure=true (só funciona em HTTPS).
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  expires: expiresAt,
});

import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'sessionId';

export const sessionCookieOptions = (expiresAt?: Date): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  expires: expiresAt,
});

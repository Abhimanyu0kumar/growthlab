import { cookies } from 'next/headers';
import { encrypt, decrypt } from './crypto';

const SESSION_COOKIE_NAME = 'growth_tracker_session';
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionPayload {
  username: string;
  expiresAt: number;
}

/**
 * Creates a secure, encrypted session cookie for the user.
 */
export async function createSession(username: string) {
  const expiresAt = Date.now() + SESSION_EXPIRY;
  const payload: SessionPayload = { username, expiresAt };
  const token = encrypt(JSON.stringify(payload));
  
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });
}

/**
 * Retrieves and validates the current session.
 */
export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie || !cookie.value) return null;
  
  try {
    const decrypted = decrypt(cookie.value);
    if (!decrypted || decrypted.startsWith('[Decryption Failed')) return null;
    
    const payload = JSON.parse(decrypted) as SessionPayload;
    if (Date.now() > payload.expiresAt) {
      // Session has expired, clear it
      await deleteSession();
      return null;
    }
    
    return payload.username;
  } catch (error) {
    console.error('Session validation failed:', error);
    return null;
  }
}

/**
 * Deletes the current session cookie.
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

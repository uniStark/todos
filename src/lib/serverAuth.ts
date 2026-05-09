import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

const DEV_AUTH_PASSWORD = 'stark123';
let warnedAboutDevFallback = false;
let warnedAboutMissingProductionPassword = false;

function getAuthPassword(): string | null {
  const configuredPassword = process.env.AUTH_PASSWORD?.trim();

  if (configuredPassword) {
    return configuredPassword;
  }

  if (process.env.NODE_ENV === 'production') {
    if (!warnedAboutMissingProductionPassword) {
      console.error('[Auth] AUTH_PASSWORD is required in production.');
      warnedAboutMissingProductionPassword = true;
    }
    return null;
  }

  if (!warnedAboutDevFallback) {
    console.warn('[Auth] AUTH_PASSWORD is not set. Using development fallback password.');
    warnedAboutDevFallback = true;
  }
  return DEV_AUTH_PASSWORD;
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function getBearerOrApiKey(request: Request): string {
  const apiKey = request.headers.get('X-API-Key')?.trim();
  if (apiKey) {
    return apiKey;
  }

  const authorization = request.headers.get('Authorization')?.trim();
  if (!authorization) {
    return '';
  }

  const [scheme, ...tokenParts] = authorization.split(/\s+/);
  if (scheme.toLowerCase() !== 'bearer') {
    return '';
  }

  return tokenParts.join(' ').trim();
}

export function verifyApiKey(request: Request): boolean {
  const password = getAuthPassword();
  if (!password) {
    return false;
  }

  const apiKey = getBearerOrApiKey(request);
  return apiKey ? safeEqual(apiKey, password) : false;
}

export function verifyPassword(password: unknown): boolean {
  const authPassword = getAuthPassword();
  return typeof password === 'string' && !!authPassword && safeEqual(password, authPassword);
}

export function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: 'Valid API key required. Use header: X-API-Key: <password> or Authorization: Bearer <password>',
    },
    { status: 401 }
  );
}

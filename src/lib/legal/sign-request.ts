import { createHmac, randomBytes } from 'crypto';

export const APP_SLUG = 'blochub';

export function blocGlobalUserId(userId: string): string {
  return `blochub:${userId}`;
}

interface SignArgs {
  globalUserId: string;
  bodyText: string;
}

interface SignedHeaders {
  'x-app-slug': string;
  'x-timestamp': string;
  'x-nonce': string;
  'x-global-user-id': string;
  'x-signature': string;
}

export function signLegalRequest({ globalUserId, bodyText }: SignArgs): SignedHeaders | null {
  if (process.env.SKIP_LEGAL_HMAC === '1') return null;

  const key = process.env.LEGAL_HMAC_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('LEGAL_HMAC_KEY is required in production');
    }
    return null;
  }

  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString('hex');
  const bodyHash = createHmac('sha256', key).update(bodyText).digest('hex');
  const message = `${APP_SLUG}:${timestamp}:${nonce}:${globalUserId}:${bodyHash}`;
  const signature = createHmac('sha256', key).update(message).digest('hex');

  return {
    'x-app-slug': APP_SLUG,
    'x-timestamp': timestamp,
    'x-nonce': nonce,
    'x-global-user-id': globalUserId,
    'x-signature': signature,
  };
}

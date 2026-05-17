import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { APP_SLUG, blocGlobalUserId, signLegalRequest } from '@/lib/legal/sign-request';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { documentVersionId, consentText, method } = body;

  if (!documentVersionId || !consentText) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const globalUserId = blocGlobalUserId(userId);
  const legalUrl = process.env.LEGAL_API_URL || 'https://legal.knowbest.ro';

  const payload = {
    appSlug: APP_SLUG,
    globalUserId,
    documentVersionId,
    consentText,
    method: method || 'IN_APP',
    ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  };

  const bodyText = JSON.stringify(payload);
  const signed = signLegalRequest({ globalUserId, bodyText });

  try {
    const res = await fetch(`${legalUrl}/api/v1/consents/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signed ?? {}),
      },
      body: bodyText,
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to record consent' }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}

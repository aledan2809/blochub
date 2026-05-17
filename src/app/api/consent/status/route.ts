import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { APP_SLUG, blocGlobalUserId } from '@/lib/legal/sign-request';

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ status: [] });
  }

  const globalUserId = blocGlobalUserId(userId);
  const legalUrl = process.env.LEGAL_API_URL || 'https://legal.knowbest.ro';

  try {
    const res = await fetch(
      `${legalUrl}/api/v1/consent/status/${APP_SLUG}/${encodeURIComponent(globalUserId)}`,
      {
        headers: { 'x-app-slug': APP_SLUG },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return NextResponse.json({ status: [] }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json({ status: Array.isArray(data.status) ? data.status : [] });
  } catch {
    return NextResponse.json({ status: [] });
  }
}

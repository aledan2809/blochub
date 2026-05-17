import { NextRequest, NextResponse } from 'next/server';
import { APP_SLUG } from '@/lib/legal/sign-request';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || !['tos', 'privacy', 'cookies'].includes(type)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  }

  const legalUrl = process.env.LEGAL_API_URL || 'https://legal.knowbest.ro';

  try {
    const res = await fetch(
      `${legalUrl}/api/v1/documents/latest?type=${type.toUpperCase()}&appSlug=${APP_SLUG}&renderTokens=true`,
      {
        headers: { 'x-app-slug': APP_SLUG },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Legal Hub error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();

    const tokens: Record<string, string> = {
      app_name: 'BlocX',
      app_slug: APP_SLUG,
      rendered_at: new Date().toISOString(),
    };

    let content: string = data.contentMarkdown || data.content || '';
    for (const [k, v] of Object.entries(tokens)) {
      content = content.replaceAll(`{${k}}`, v);
    }

    return NextResponse.json({
      contentMarkdown: content,
      versionId: data.versionId || data.id,
      version: data.version,
      entityName: data.entityName,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 502 });
  }
}

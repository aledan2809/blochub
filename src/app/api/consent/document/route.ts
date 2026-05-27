import { NextRequest, NextResponse } from 'next/server';
import { APP_SLUG } from '@/lib/legal/sign-request';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || !['tos', 'privacy', 'cookies'].includes(type)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  }

  const legalUrl = process.env.LEGAL_API_URL || 'https://legal.knowbest.ro';

  // App-specific GDPR/DPO contact — blochub uses its own domain mailbox,
  // not the shared controller-entity dpoEmail (Class RDA serves several apps).
  const APP_DPO_EMAIL = 'dpo@blocx.ro';

  try {
    const res = await fetch(
      `${legalUrl}/api/v1/public/legal/${APP_SLUG}/${type}`,
      {
        headers: { 'x-app-slug': APP_SLUG },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Legal Hub error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const entity = data.entity ?? {};
    const version = data.version ?? {};

    const addr = entity.address ?? {};
    const entityAddress = [addr.street, addr.sector, addr.city, addr.country]
      .filter(Boolean)
      .join(', ');

    // Legal returns raw markdown with {tokens}; substitution happens here.
    const tokens: Record<string, string> = {
      app_name: 'BlocX',
      app_slug: APP_SLUG,
      effective_date: version.effectiveFrom
        ? new Date(version.effectiveFrom).toLocaleDateString('ro-RO')
        : '',
      version: version.version ?? '',
      entity_name: entity.name ?? '',
      entity_cui: entity.cui ?? '',
      entity_jurisdiction: entity.jurisdiction ?? '',
      entity_address: entityAddress,
      entity_dpo_email: APP_DPO_EMAIL,
    };

    let content: string = version.contentMarkdown || '';
    for (const [k, v] of Object.entries(tokens)) {
      content = content.replaceAll(`{${k}}`, v);
    }

    return NextResponse.json({
      contentMarkdown: content,
      versionId: version.id,
      version: version.version,
      entityName: entity.name,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 502 });
  }
}

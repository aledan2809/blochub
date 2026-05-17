'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BlocConsentBanner } from './BlocConsentBanner';

interface ConsentItem {
  type: string;
  latestVersionId: string;
  accepted: boolean;
}

const CACHE_KEY = 'bloc_consent_status_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function loadCache(): { items: ConsentItem[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(items: ConsentItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() }));
  } catch {
    // storage unavailable
  }
}

export function BlocConsentGate() {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState<ConsentItem[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    async function check() {
      let items: ConsentItem[] = [];

      if (status === 'authenticated' && session?.user) {
        try {
          const res = await fetch('/api/consent/status', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            items = Array.isArray(data.status) ? data.status : [];
            saveCache(items);
          } else {
            throw new Error(`status ${res.status}`);
          }
        } catch {
          const cached = loadCache();
          if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
            items = cached.items;
          } else {
            setChecked(true);
            return;
          }
        }
      } else {
        setChecked(true);
        return;
      }

      const needsConsent = items.filter((item) => {
        if (item.accepted) return false;
        if (localStorage.getItem(`consent_accepted_bloc_${item.latestVersionId}`) === 'true') return false;
        if (localStorage.getItem(`consent_dismissed_bloc_${item.type}`) === 'true') return false;
        return true;
      });

      setPending(needsConsent);
      setChecked(true);
    }

    check();
  }, [status, session]);

  if (!checked || pending.length === 0) return null;

  const current = pending[0];

  function handleResolved() {
    setPending((prev) => prev.slice(1));
  }

  return (
    <BlocConsentBanner
      key={current.latestVersionId}
      docType={current.type}
      versionId={current.latestVersionId}
      onAgree={handleResolved}
      onDismiss={handleResolved}
    />
  );
}

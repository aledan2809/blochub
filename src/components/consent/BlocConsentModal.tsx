'use client';

import { useEffect, useRef, useState } from 'react';

interface BlocConsentModalProps {
  docType: string;
  onAgree: () => void;
  onDisagree: () => void;
  onClose: () => void;
}

type DocState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      contentMarkdown: string;
      versionId: string;
      version: string | null;
      entityName: string | null;
    };

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      nodes.push(<h1 key={i} className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{renderInline(line.slice(2))}</h1>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-5 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">{renderInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-4 mb-1">{renderInline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.trim() === '---') {
      nodes.push(<hr key={i} className="border-gray-200 dark:border-gray-700 my-3" />);
      i++; continue;
    }
    if (line.startsWith('- ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(<li key={i} className="ml-4 text-gray-600 dark:text-gray-400 text-sm leading-relaxed list-disc">{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="my-2 space-y-1">{items}</ul>);
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const row = lines[i].split('|').slice(1, -1).map((c) => c.trim());
        if (!row.every((c) => /^[-:\s]+$/.test(c))) rows.push(row);
        i++;
      }
      if (rows.length > 0) {
        nodes.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>{rows[0].map((cell, ci) => <th key={ci} className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-left text-gray-700 dark:text-gray-300 font-semibold bg-gray-50 dark:bg-gray-800">{cell}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className="even:bg-gray-50 dark:even:bg-gray-800/50">
                    {row.map((cell, ci) => <td key={ci} className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-gray-600 dark:text-gray-400">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    nodes.push(<p key={i} className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed my-1.5">{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

export function BlocConsentModal({ docType, onAgree, onDisagree, onClose }: BlocConsentModalProps) {
  const [state, setState] = useState<DocState>({ status: 'loading' });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const docLabel =
    docType === 'TOS'
      ? 'Termenii și Condițiile'
      : docType === 'PRIVACY'
        ? 'Politica de Confidențialitate'
        : 'Politica de Cookies';

  useEffect(() => {
    fetch(`/api/consent/document?type=${docType.toLowerCase()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setState({ status: 'error', message: data.error });
        else setState({ status: 'ready', contentMarkdown: data.contentMarkdown, versionId: data.versionId, version: data.version, entityName: data.entityName });
      })
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [docType]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setHasScrolled(true);
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={docLabel}>
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{docLabel}</h2>
        <button onClick={onClose} aria-label="Închide" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none p-1">×</button>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 bg-white dark:bg-gray-900">
        {state.status === 'loading' && (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Se încarcă documentul…</div>
        )}
        {state.status === 'error' && (
          <div className="flex items-center justify-center h-40 text-red-500 text-sm text-center px-4">Nu am putut încărca documentul. Încearcă din nou.</div>
        )}
        {state.status === 'ready' && (
          <div>
            {state.version && <p className="text-xs text-gray-400 mb-4">Versiune: {state.version}</p>}
            {renderMarkdown(state.contentMarkdown)}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
        {!hasScrolled && state.status === 'ready' && (
          <p className="text-xs text-gray-400 text-center mb-1">Derulează până la capăt pentru a putea accepta</p>
        )}
        <button
          onClick={onAgree}
          disabled={!hasScrolled && state.status === 'ready'}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          SUNT DE ACORD
        </button>
        <button
          onClick={onDisagree}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          NU SUNT DE ACORD
        </button>
      </div>
    </div>
  );
}

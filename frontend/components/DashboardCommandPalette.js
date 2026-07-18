'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { dashboardNavigation } from '../lib/dashboardNavigation';

const sections = dashboardNavigation.flatMap(group => group.items.map(item => [item.label, item.id, `${group.label} ${group.description} ${item.keywords || ''}`]));

export default function DashboardCommandPalette({ enabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef(null);
  const results = useMemo(() => {
    const search = query.toLowerCase();
    return sections.filter(([label, , keywords]) => `${label} ${keywords}`.toLowerCase().includes(search));
  }, [query]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(value => !value); }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

  useEffect(() => { if (open) { setQuery(''); input.current?.focus(); } }, [open]);
  if (!enabled || !open) return null;

  const guildId = window.location.pathname.split('/')[2];
  const go = section => { window.location.href = `/dashboard/${guildId}/${section}`; setOpen(false); };
  return <div className="command-palette" role="dialog" aria-modal="true" aria-label="Find dashboard page" onClick={() => setOpen(false)}>
    <div className="command-palette-card" onClick={event => event.stopPropagation()}>
      <div className="command-palette-search"><span aria-hidden="true">⌕</span><input ref={input} value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a dashboard page…" aria-label="Find a dashboard page" /><kbd>ESC</kbd></div>
      <div className="command-palette-results">{results.length ? results.map(([label, hash]) => <button type="button" key={hash} onClick={() => go(hash)}><span>{label}</span><i aria-hidden="true">→</i></button>) : <p>No dashboard page matches “{query}”.</p>}</div>
      <div className="command-palette-footer"><span>Navigate server settings faster</span><kbd>⌘ K</kbd></div>
    </div>
  </div>;
}

'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import { ACTIONS } from './actions-list';

const box: CSSProperties = { height: 46, border: '2px solid #e6dbef', borderRadius: 14, padding: '0 12px', background: '#fff', fontSize: 15, color: '#2e0f38', font: 'inherit' };

// Filters live in the address bar, so a filtered view survives a refresh. Dates are on the viewer's own calendar.
export function LogFilters({ teachers }: { teachers: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');

  const set = (changes: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    p.delete('more');
    if (p.get('from') || p.get('to')) p.set('tz', String(new Date().getTimezoneOffset())); else p.delete('tz');
    router.replace(`${path}${p.size ? '?' + p : ''}`, { scroll: false });
  };

  // Search after a short pause in typing.
  useEffect(() => {
    if (q === (params.get('q') || '')) return;
    const t = setTimeout(() => set({ q: q.trim() }), 350);
    return () => clearTimeout(t);
  });

  return (
    <div role="search" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search teacher or item" aria-label="Search teacher or item" maxLength={80}
        style={{ ...box, flex: '1 1 220px', padding: '0 14px' }} />
      <select value={params.get('teacher') || ''} onChange={e => set({ teacher: e.target.value })} aria-label="Teacher" style={box}>
        <option value="">All teachers</option>
        {teachers.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select value={params.get('action') || ''} onChange={e => set({ action: e.target.value })} aria-label="Action type" style={box}>
        <option value="">All actions</option>
        {Object.keys(ACTIONS).map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <input type="date" value={params.get('from') || ''} onChange={e => set({ from: e.target.value })} aria-label="From date" style={{ ...box, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
      <input type="date" value={params.get('to') || ''} onChange={e => set({ to: e.target.value })} aria-label="To date" style={{ ...box, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
      <button onClick={() => { setQ(''); router.replace(path, { scroll: false }); }}
        style={{ minHeight: 46, padding: '0 14px', border: 'none', background: 'none', fontSize: 14, textDecoration: 'underline', cursor: 'pointer', color: '#5c4766' }}>Clear</button>
    </div>
  );
}

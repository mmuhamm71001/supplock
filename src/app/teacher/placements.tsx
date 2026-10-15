'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { placeRequest } from '@/app/spaces/actions';

export type Placement = { id: string; kind: 'supply' | 'custom' | 'laptop'; title: string; qty: number; icon: string | null };

// "Where should these go?" after a request is approved (or a custom one delivered).
export function Placements({ items, spaces }: { items: Placement[]; spaces: { id: string; name: string }[] }) {
  if (!items.length || !spaces.length) return null;
  return (
    <section aria-labelledby="place-h" style={{ background: '#fff', border: '2px solid #8351a8', borderRadius: 22, padding: '16px 18px', marginBottom: 24, boxShadow: '0 5px 0 #c2abd4' }}>
      <h2 id="place-h" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: 0 }}>Where should these go?</h2>
      <div style={{ fontSize: 14, color: '#5c4766', margin: '2px 0 6px' }}>Your approved items are ready. Pick a space and they&apos;ll be added to its inventory.</div>
      {items.map(p => <Row key={p.id} p={p} spaces={spaces} />)}
    </section>
  );
}

function Row({ p, spaces }: { p: Placement; spaces: { id: string; name: string }[] }) {
  const router = useRouter();
  const [space, setSpace] = useState(spaces[0].id);
  const [loan, setLoan] = useState(p.kind === 'laptop');
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const go = (to: string | null) => start(async () => {
    setErr('');
    const r = await placeRequest(p.id, to, loan);
    if (r.error) return setErr(r.error);
    if (to) router.push(`/teacher?tab=spaces&space=${to}`);
  });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px solid #efe7f3', opacity: busy ? 0.6 : 1 }}>
      <Icon name={p.kind === 'laptop' ? 'laptop' : p.icon} label={p.title} size={40} />
      <div style={{ flex: '1 1 160px', fontWeight: 700, fontSize: 16 }}>{p.title} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>×{p.qty}</span></div>
      <select value={space} onChange={e => setSpace(e.target.value)} aria-label={`Space for ${p.title}`}
        style={{ height: 44, maxWidth: 240, border: '2px solid #e6dbef', borderRadius: 12, padding: '0 10px', fontSize: 15, background: '#fff', color: '#2e0f38' }}>
        {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, minHeight: 44, cursor: 'pointer' }}>
        <input type="checkbox" checked={loan} onChange={e => setLoan(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#8351a8' }} />On loan
      </label>
      <button disabled={busy} onClick={() => go(space)} aria-label={`Add ${p.title} to the space`}
        style={{ minHeight: 44, padding: '0 18px', border: 'none', borderRadius: 12, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 3px 0 #5e3680' }}>Add</button>
      <button disabled={busy} onClick={() => go(null)} style={{ minHeight: 44, padding: '0 6px', border: 'none', background: 'none', color: '#5c4766', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Don&apos;t add</button>
      <ErrorText>{err}</ErrorText>
    </div>
  );
}

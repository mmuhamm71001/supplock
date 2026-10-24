'use client';
import { useState, useSyncExternalStore, useTransition, type CSSProperties } from 'react';
import { ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { fmtDate, isoPlus } from '@/lib/format';
import { borrowUntil, returnBorrowed } from './actions';

export type Borrow = { id: string; title: string; qty: number; until: string; icon: string | null };

const noop = () => () => {};
const btn: CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer' };

// Things the teacher borrowed and hasn't given back yet.
export function Borrowed({ items }: { items: Borrow[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="borrowed-h" style={{ background: '#fff', border: '2px solid #4d7b93', borderRadius: 22, padding: '16px 18px', marginBottom: 24, boxShadow: '0 5px 0 #b9cfda' }}>
      <h2 id="borrowed-h" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: 0 }}>Things you&apos;ve borrowed</h2>
      <div style={{ fontSize: 14, color: '#5c4766', margin: '2px 0 6px' }}>When you take it back to the office, tap &ldquo;I gave it back&rdquo;.</div>
      {items.map(b => <Row key={b.id} b={b} />)}
    </section>
  );
}

function Row({ b }: { b: Borrow }) {
  const [editing, setEditing] = useState(false);
  const [until, setUntil] = useState(b.until);
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  // Today on the teacher's own calendar, so "overdue" flips at their midnight.
  const today = useSyncExternalStore(noop, () => isoPlus(0), () => '');
  const late = !!today && b.until < today;
  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => { setErr(''); const r = await fn(); if (r.error) setErr(r.error); else after?.(); });

  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid #efe7f3', opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Icon name={b.icon} label={b.title} size={48} />
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{b.title} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>×{b.qty}</span></div>
          <div style={{ fontSize: 14, color: late ? '#8c1c45' : '#5c4766', fontWeight: late ? 700 : 400 }}>
            {late ? 'Overdue · was due back ' : b.until === today ? 'Due back today · ' : 'Due back '}{fmtDate(b.until)}
          </div>
        </div>
        <button disabled={busy} onClick={() => setEditing(e => !e)} aria-expanded={editing}
          style={{ ...btn, border: '2px solid #2e0f38', background: '#fff', color: '#2e0f38' }}>Need it longer?</button>
        <button disabled={busy} onClick={() => run(() => returnBorrowed(b.id))} aria-label={`I gave back ${b.title}`}
          style={{ ...btn, border: 'none', background: '#4d7b93', color: '#fff', boxShadow: '0 4px 0 #2f4f60' }}>I gave it back</button>
      </div>
      {editing && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 700 }}>
            New return date
            <input type="date" value={until} min={isoPlus(0)} max={isoPlus(183)} onChange={e => setUntil(e.target.value)}
              style={{ height: 44, border: '2px solid #e6dbef', borderRadius: 12, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 14, color: '#2e0f38', background: '#fff' }} />
          </label>
          <button disabled={busy || !until || until === b.until} onClick={() => run(() => borrowUntil(b.id, until), () => setEditing(false))}
            style={{ ...btn, border: 'none', background: '#8351a8', color: '#fff', opacity: !until || until === b.until ? 0.5 : 1 }}>Save date</button>
        </div>
      )}
      <ErrorText>{err}</ErrorText>
    </div>
  );
}

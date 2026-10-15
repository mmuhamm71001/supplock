'use client';
import { useState, useTransition } from 'react';
import { ErrorText } from '@/components/form';
import { Stamp } from '@/components/stamp';
import { handleNotice } from './actions';

export type Notice = { id: string; teacher_name: string; text: string; created_at: string };

function Row({ n }: { n: Notice }) {
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  return (
    <li style={{ padding: '12px 0', borderTop: '1px solid #efe7f3', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', opacity: busy ? 0.6 : 1 }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>“{n.text}”</div>
        <div style={{ fontSize: 14, color: '#5c4766' }}>{n.teacher_name || 'Former teacher'} · <Stamp ts={n.created_at} /></div>
        <ErrorText>{err}</ErrorText>
      </div>
      <button disabled={busy} aria-label={`Mark handled: ${n.text}`}
        onClick={() => start(async () => { setErr(''); const res = await handleNotice(n.id); if (res.error) setErr(res.error); })}
        style={{ minHeight: 44, padding: '0 14px', border: 'none', borderRadius: 12, background: '#4d7b93', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Handled ✓</button>
    </li>
  );
}

// Things teachers noticed (copy paper, tissues…) that nobody requests one at a time.
export function Notices({ rows }: { rows: Notice[] }) {
  if (!rows.length) return null;
  return (
    <div style={{ background: '#fff', borderRadius: 26, padding: '20px 22px', border: '2px solid #b45dbb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, margin: 0 }}>Notes from teachers</h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, background: '#f1dff3', color: '#6e2c74', padding: '4px 10px', borderRadius: 999 }}>{rows.length} open</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map(n => <Row key={n.id} n={n} />)}
      </ul>
    </div>
  );
}

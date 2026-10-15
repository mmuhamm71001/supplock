'use client';
import { useState, useTransition, type CSSProperties } from 'react';
import { ErrorText } from '@/components/form';
import { Stamp } from '@/components/stamp';
import { fmtDate, isoPlus, reqTitle, statusOf, type RequestRow } from '@/lib/format';
import { approve, changeEta, deny, markOrdered, markReceived } from './actions';
import { Icon } from '@/components/icon';

export type QueueRow = RequestRow & { teacher: string; avail: number | null };

const card: CSSProperties = { background: '#fff', borderRadius: 26, padding: '20px 22px', border: '2px solid #e6dbef' };
const h2: CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, margin: 0 };
const step: CSSProperties = { width: 40, height: 40, border: 'none', borderRadius: 10, background: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer', color: '#2e0f38' };
const tag = (bg: string): CSSProperties => ({ fontSize: 12, fontWeight: 700, color: '#fff', background: bg, padding: '3px 8px', borderRadius: 8 });

function Pending({ r }: { r: QueueRow }) {
  const [qty, setQty] = useState(r.qty);
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const fixed = r.kind === 'laptop' && r.laptop_type === 'full';
  const exceeds = r.avail !== null && qty > r.avail;
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => { setErr(''); const res = await fn(); if (res.error) setErr(res.error); });
  const meta = [
    r.teacher, r.room || 'no classroom',
    r.kind === 'laptop' && r.laptop_type === 'temp' ? `${fmtDate(r.from_date)} – ${fmtDate(r.to_date)}` : '',
    r.kind === 'custom' && r.needed_by ? 'needed by ' + fmtDate(r.needed_by) : ''
  ].filter(Boolean);

  return (
    <li style={{ padding: '14px 0', borderTop: '1px solid #efe7f3', opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{reqTitle(r)}</span>
            {r.kind === 'custom' && <span style={tag('#b45dbb')}>Custom Request</span>}
            {r.kind === 'laptop' && <span style={tag('#1a2c54')}>Laptop</span>}
          </div>
          <div style={{ fontSize: 14, color: '#5c4766', marginTop: 3 }}>
            {meta[0]} · {meta[1]} · <Stamp ts={r.created_at} />{meta.slice(2).map(m => ' · ' + m).join('')}
          </div>
          {exceeds && <div style={{ display: 'inline-block', marginTop: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: '#8c1c45', padding: '4px 9px', borderRadius: 8 }}>Exceeds available stock ({r.avail} available)</div>}
          {r.note && <div style={{ fontSize: 14, fontStyle: 'italic', marginTop: 5 }}>“{r.note}”</div>}
          {r.url && (
            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, display: 'block', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {r.url.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
        </div>
        <div role="group" aria-label="Amount to approve" style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1eaf5', borderRadius: 14, padding: 4 }}>
          <button aria-label="Decrease" disabled={fixed || busy} onClick={() => setQty(q => Math.max(1, q - 1))} style={{ ...step, opacity: fixed ? 0.4 : 1 }}>−</button>
          <span aria-live="polite" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, minWidth: 34, textAlign: 'center' }}>{qty}</span>
          <button aria-label="Increase" disabled={fixed || busy} onClick={() => setQty(q => Math.min(999, q + 1))} style={{ ...step, opacity: fixed ? 0.4 : 1 }}>+</button>
        </div>
      </div>
      <ErrorText>{err}</ErrorText>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button disabled={busy} onClick={() => run(() => approve(r.id, qty))} aria-label={`Approve ${reqTitle(r)} for ${r.teacher}`}
          style={{ flex: 1, minHeight: 48, border: 'none', borderRadius: 14, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680' }}>Approve</button>
        <button disabled={busy} onClick={() => run(() => deny(r.id))} aria-label={`Deny ${reqTitle(r)} for ${r.teacher}`}
          style={{ flex: 1, minHeight: 48, border: '2px solid #2e0f38', borderRadius: 14, background: '#fff', color: '#2e0f38', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 0 #2e0f38' }}>Deny</button>
      </div>
    </li>
  );
}

export function ApprovalQueue({ rows }: { rows: QueueRow[] }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <h2 style={h2}>Approval queue</h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, background: '#f1dff3', color: '#6e2c74', padding: '4px 10px', borderRadius: 999 }}>{rows.length} pending</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map(r => <Pending key={r.id} r={r} />)}
      </ul>
      {rows.length === 0 && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px 44px', gap: 8 }}>
          <sl-block deco="1" aria-hidden="true" color="lavender" tilt="-10" float="2" radius="16" style={{ position: 'absolute', left: '10%', top: 22, width: 46, height: 46 }} />
          <sl-block deco="1" aria-hidden="true" color="teal" tilt="8" float="4" radius="12" style={{ position: 'absolute', right: '12%', top: 46, width: 32, height: 32 }} />
          <sl-block deco="1" aria-hidden="true" mhide="1" color="pink" tilt="6" float="1" radius="14" style={{ position: 'absolute', right: '6%', bottom: 14, width: 58, height: 24 }} />
          <Icon name="shelf" size={120} variant="detail" />
          <div style={{ fontFamily: 'var(--font-hand)', fontSize: 30, fontWeight: 700, color: '#5e3680' }}>all caught up ★</div>
          <div style={{ fontSize: 16, color: '#3d2547', maxWidth: 380 }}>No requests waiting. New ones show up here as soon as a teacher sends them.</div>
        </div>
      )}
    </div>
  );
}

const dateInput: CSSProperties = { height: 44, border: '2px solid #e6dbef', borderRadius: 12, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#2e0f38', background: '#fff' };
const small = (bg: string): CSSProperties => ({ minHeight: 44, padding: '0 14px', border: 'none', borderRadius: 12, background: bg, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' });

function Custom({ r }: { r: QueueRow }) {
  const [eta, setEta] = useState(() => r.eta || isoPlus(7));
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const s = statusOf(r);
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => { setErr(''); const res = await fn(); if (res.error) setErr(res.error); });
  const picker = (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, fontWeight: 700, color: '#5c4766' }}>
      Expected arrival
      <input type="date" value={eta} min={isoPlus(0)} onChange={e => setEta(e.target.value)} style={dateInput} />
    </label>
  );
  return (
    <li style={{ padding: '12px 0', borderTop: '1px solid #efe7f3', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', opacity: busy ? 0.6 : 1 }}>
      <div style={{ flex: 1, minWidth: 200, alignSelf: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{r.name} ×{r.qty}</div>
        <div style={{ fontSize: 14, color: '#5c4766' }}>{r.teacher}{r.needed_by ? ' · needed by ' + fmtDate(r.needed_by) : ''}</div>
        {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700 }}>Open product link ↗</a>}
        <div><span style={{ display: 'inline-block', marginTop: 5, fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 8, color: s.fg, background: s.bg }}>{s.label}</span></div>
        <ErrorText>{err}</ErrorText>
      </div>
      {r.status === 'approved' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {picker}
          <button disabled={busy} onClick={() => run(() => markOrdered(r.id, eta))} style={small('#1a2c54')}>Mark ordered</button>
        </div>
      )}
      {r.status === 'ordered' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {picker}
          {eta !== r.eta && <button disabled={busy} onClick={() => run(() => changeEta(r.id, eta))} style={small('#8351a8')}>Save date</button>}
          <button disabled={busy} onClick={() => run(() => markReceived(r.id))} style={small('#4d7b93')}>Mark received</button>
        </div>
      )}
    </li>
  );
}

export function CustomOrders({ rows }: { rows: QueueRow[] }) {
  return (
    <div style={card}>
      <h2 style={{ ...h2, marginBottom: 6 }}>Custom orders in progress</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map(r => <Custom key={r.id} r={r} />)}
      </ul>
      {rows.length === 0 && <div style={{ fontSize: 15, color: '#5c4766', padding: '10px 0' }}>Nothing waiting to be ordered.</div>}
    </div>
  );
}

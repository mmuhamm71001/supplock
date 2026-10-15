'use client';
import { useState, useTransition, type CSSProperties } from 'react';
import { ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { fmtDate } from '@/lib/format';
import { addLaptops, removeLaptop, returnLaptop, toggleZoom } from './actions';

export type Laptop = { id: string; tag: string; status: 'available' | 'out' | 'assigned'; zoom: boolean; room: string; due_date: string | null; holder: string };

const card: CSSProperties = { background: '#fff', borderRadius: 24, padding: '20px 22px', border: '2px solid #e6dbef' };
const h2: CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, margin: '0 0 6px' };
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #efe7f3', flexWrap: 'wrap' };
const outline: CSSProperties = { minHeight: 44, padding: '0 14px', border: '2px solid #2e0f38', borderRadius: 12, background: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#2e0f38' };
const tag: CSSProperties = { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, minWidth: 64 };
const STATUS = { available: 'Available', out: 'Checked out', assigned: 'In classroom' };
const COLOR = { available: 'teal', out: 'purple', assigned: 'orchid' } as const;
const TILT = ['-3', '2', '-1.5', '3', '-2', '1'];

export function Laptops({ laptops }: { laptops: Laptop[] }) {
  const [err, setErr] = useState('');
  const [howMany, setHowMany] = useState(1);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => { setErr(''); const r = await fn(); if (r.error) setErr(r.error); });

  const n = (s: Laptop['status']) => laptops.filter(l => l.status === s).length;
  const c = { total: laptops.length, available: n('available'), out: n('out'), assigned: n('assigned'), zoom: laptops.filter(l => l.zoom).length };
  const pct = (x: number) => (c.total ? (x / c.total) * 100 : 0);
  const pA = pct(c.available), pO = pct(c.out), pS = pct(c.assigned);
  const who = (l: Laptop) => l.holder || 'Former teacher';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: 0 }}>Laptops</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>How many
            <input type="number" min={1} max={200} value={howMany} onChange={e => setHowMany(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              style={{ width: 70, height: 48, border: '2px solid #e6dbef', borderRadius: 12, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 16, color: '#2e0f38' }} />
          </label>
          <button disabled={busy} onClick={() => run(async () => { const r = await addLaptops(howMany); if (!r.error) setHowMany(1); return r; })}
            style={{ minHeight: 48, padding: '0 18px', whiteSpace: 'nowrap', border: 'none', borderRadius: 14, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680' }}>
            + Add {howMany === 1 ? 'laptop' : `${howMany} laptops`}
          </button>
        </div>
      </div>
      <ErrorText>{err}</ErrorText>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, margin: '4px 0 22px' }}>
        {([[c.total, 'Total', '#2e0f38', '#fff', '#1a0621'], [c.available, 'Available', '#4d7b93', '#fff', '#335a6e'], [c.out, 'Checked out', '#8351a8', '#fff', '#5e3680'],
          [c.assigned, 'Assigned to classrooms', '#1a2c54', '#fff', '#0f1b37'], [c.zoom, 'Zoom installed', '#e6dbef', '#2e0f38', '#c2abd4']] as const).map(([num, label, bg, fg, edge]) => (
          <div key={label} style={{ background: bg, color: fg, borderRadius: 22, padding: '16px 18px', boxShadow: `0 5px 0 ${edge}` }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700 }}>{num}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 22, alignItems: 'start', marginBottom: 22 }}>
        <section style={card} aria-labelledby="as-h">
          <h2 id="as-h" style={h2}>Assigned to classrooms</h2>
          {laptops.filter(l => l.status === 'assigned').map(l => (
            <div key={l.id} style={row}>
              <Icon name="laptop" size={40} /><span style={tag}>{l.tag}</span>
              <span style={{ flex: 1, fontSize: 15 }}>{l.room || 'No room'} · {who(l)}</span>
              <button disabled={busy} onClick={() => run(() => returnLaptop(l.id))} aria-label={`Mark ${l.tag} returned`} style={outline}>Mark returned</button>
            </div>
          ))}
          {c.assigned === 0 && <div style={{ fontSize: 15, color: '#5c4766', padding: '8px 0' }}>No laptops assigned full-time.</div>}
        </section>
        <section style={card} aria-labelledby="out-h">
          <h2 id="out-h" style={h2}>Checked out</h2>
          {laptops.filter(l => l.status === 'out').map(l => (
            <div key={l.id} style={row}>
              <Icon name="laptop" size={40} /><span style={tag}>{l.tag}</span>
              <span style={{ flex: 1, fontSize: 15 }}>{who(l)}{l.due_date ? ' · due ' + fmtDate(l.due_date) : ''}</span>
              <button disabled={busy} onClick={() => run(() => returnLaptop(l.id))} aria-label={`${l.tag} returned`} style={outline}>Returned</button>
            </div>
          ))}
          {c.out === 0 && <div style={{ fontSize: 15, color: '#5c4766', padding: '8px 0' }}>Everything&apos;s back on the cart.</div>}
        </section>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 560px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <h2 style={{ ...h2, margin: 0 }}>All laptops</h2>
            <span style={{ fontFamily: 'var(--font-hand)', fontSize: 22, color: '#5e3680' }}>tap the switch to track Zoom installs</span>
          </div>
          {laptops.length === 0 && (
            <div style={{ fontFamily: 'var(--font-hand)', fontSize: 28, color: '#5e3680', padding: '10px 0' }}>no laptops yet. Add your cart with the button above.</div>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '22px 16px' }}>
            {laptops.map((l, i) => (
              <li key={l.id}>
                <sl-block color={COLOR[l.status]} tilt={TILT[i % 6]} nofloat="1" radius="24" style={{ padding: '12px 14px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ position: 'relative', flex: 'none', background: '#f6f1f8', borderRadius: 14, padding: 2, display: 'flex' }}>
                      <Icon name="laptop" size={40} />
                      {l.zoom && (
                        <span title="Zoom installed" style={{ position: 'absolute', right: -7, top: -7, width: 22, height: 22, borderRadius: '50%', background: '#2e0f38', border: '2px solid #fff', display: 'grid', placeItems: 'center' }}>
                          <span style={{ position: 'relative', width: 9, height: 7, borderRadius: 2, background: '#fff', marginLeft: -3, display: 'block' }}>
                            <span style={{ position: 'absolute', left: 9, top: 1, width: 0, height: 0, borderLeft: '4px solid #fff', borderTop: '2.5px solid transparent', borderBottom: '2.5px solid transparent', display: 'block' }} />
                          </span>
                        </span>
                      )}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 19 }}>{l.tag}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{STATUS[l.status]}</div>
                    </div>
                    {l.status === 'available' && (
                      <button disabled={busy} onClick={() => { if (confirm(`Remove ${l.tag}? Use this for a laptop that was added by mistake or retired.`)) run(() => removeLaptop(l.id)); }}
                        aria-label={`Remove ${l.tag}`} title={`Remove ${l.tag}`}
                        style={{ flex: 'none', width: 32, height: 32, border: 'none', borderRadius: 10, background: 'rgba(255,255,255,.35)', color: 'inherit', fontSize: 16, cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, minHeight: 18, marginTop: 8 }}>{l.status === 'available' ? 'On the cart' : `${who(l)}${l.room ? ' · ' + l.room : ''}`}</div>
                  <button role="switch" aria-checked={l.zoom} aria-label={`Zoom installed on ${l.tag}`} disabled={busy} onClick={() => run(() => toggleZoom(l.id))}
                    style={{ marginTop: 4, width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: 0, fontSize: 14, fontWeight: 500, cursor: 'pointer', color: 'inherit' }}>
                    <span>Zoom installed</span>
                    <span style={{ position: 'relative', width: 46, height: 26, borderRadius: 999, background: l.zoom ? '#2e0f38' : 'rgba(255,255,255,.4)', display: 'block' }}>
                      <span style={{ position: 'absolute', top: 3, left: l.zoom ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block', transition: 'left .15s' }} />
                    </span>
                  </button>
                </sl-block>
              </li>
            ))}
          </ul>
        </div>

        <sl-block color="paper" tilt="3" float="2" style={{ flex: '0 1 280px', padding: '22px 24px', position: 'sticky', top: 90 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: '0 0 12px' }}>Where they are</h2>
          <svg width="160" height="160" viewBox="0 0 42 42" style={{ display: 'block', margin: '0 auto 14px', transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#efe7f3" strokeWidth="6" />
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#4d7b93" strokeWidth="6" strokeDasharray={`${pA} ${100 - pA}`} strokeDashoffset="0" />
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#8351a8" strokeWidth="6" strokeDasharray={`${pO} ${100 - pO}`} strokeDashoffset={-pA} />
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#bf6cc6" strokeWidth="6" strokeDasharray={`${pS} ${100 - pS}`} strokeDashoffset={-(pA + pO)} />
          </svg>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 12px', fontSize: 15, margin: 0 }}>
            {([['Available', '#4d7b93', c.available], ['Checked out', '#8351a8', c.out], ['In classrooms', '#bf6cc6', c.assigned]] as const).map(([label, color, num]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i style={{ width: 12, height: 12, borderRadius: 4, background: color, display: 'block' }} />{label}</dt>
                <dd style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, margin: 0 }}>{num}</dd>
              </div>
            ))}
          </dl>
        </sl-block>
      </div>
    </>
  );
}

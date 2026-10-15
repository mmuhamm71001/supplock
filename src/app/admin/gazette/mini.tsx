'use client';
import Link from 'next/link';
import { useState, useTransition, type CSSProperties } from 'react';
import { ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { When } from '@/components/when';
import { fmtDate, level } from '@/lib/format';
import { addTodo, setTodoDone } from './actions';
import { miniHeadline } from './lead';
import type { GazetteData } from './types';

const ANTON = 'var(--font-anton), Impact, sans-serif';
const SERIF = 'var(--font-old-standard), Georgia, serif';
const PLAYFAIR = 'var(--font-playfair), var(--font-old-standard), serif';
const PAPER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.008 .016' numOctaves='3' seed='7'/%3E%3CfeDiffuseLighting lighting-color='%23f4ecdf' surfaceScale='2'%3E%3CfeDistantLight azimuth='45' elevation='58'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)' opacity='.5'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 .18 0 0 0 0 .06 0 0 0 0 .22 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const cell: CSSProperties = { borderLeft: '1px solid #2e0f38', borderTop: '1px solid #2e0f38' };

// The dashboard's mini edition: today's to-dos, low stock and the most pressing custom request.
export function MiniGazette({ data }: { data: GazetteData }) {
  const [recent, setRecent] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) => start(async () => { setErr(''); const r = await fn(); if (r.error) setErr(r.error); else after?.(); });

  const shown = data.todos.filter(t => !t.done || recent.includes(t.id));
  const low = data.items.filter(i => level(i) !== 'ok').sort((a, b) => a.qty / Math.max(1, a.low_threshold) - b.qty / Math.max(1, b.low_threshold));
  const want = data.requests.filter(r => r.kind === 'custom' && (r.status === 'pending' || r.status === 'approved'))
    .sort((a, b) => (a.needed_by || '9').localeCompare(b.needed_by || '9'))[0];

  return (
    <section aria-label="The Supplock Gazette, mini edition" style={{ position: 'relative', transform: 'rotate(-0.8deg)', margin: '6px 4px 14px', fontFamily: SERIF }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="mg-deckle" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="2" /><feDisplacementMap in="SourceGraphic" scale="5" /></filter>
        <filter id="mg-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="nz" /><feDisplacementMap in="SourceGraphic" in2="nz" scale="2" result="r" /><feTurbulence type="fractalNoise" baseFrequency="2.6" seed="9" result="sp" /><feColorMatrix in="sp" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.2 0 0 0 2.15" result="m" /><feComposite in="r" in2="m" operator="in" /></filter>
      </svg>
      <div aria-hidden="true" style={{ position: 'absolute', inset: '8px -6px -10px 10px', transform: 'rotate(2.2deg)', background: '#e4d8c4', boxShadow: '0 2px 6px rgba(46,15,56,.18)', filter: 'url(#mg-deckle)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundColor: '#efe6d6', backgroundImage: PAPER, backgroundBlendMode: 'multiply', boxShadow: 'inset 0 0 70px rgba(78,40,70,.24),inset 0 0 18px rgba(78,40,70,.1),0 14px 28px rgba(46,15,56,.2),0 2px 5px rgba(46,15,56,.14)', filter: 'url(#mg-deckle)' }} />
      <div style={{ position: 'relative', padding: '18px 20px 14px', color: '#2e0f38', containerType: 'inline-size' }}>
        <div style={{ borderTop: '1px solid #2e0f38', borderBottom: '1px solid #2e0f38', padding: '4px 0', textAlign: 'center', fontSize: 11.5, fontWeight: 700, letterSpacing: '.12em', fontVariant: 'small-caps', textTransform: 'lowercase' }}>
          Vol. 1 · No. <When f="issue" /> · <When f="dateline" /> · School Edition
        </div>
        <div style={{ fontFamily: ANTON, fontSize: 'clamp(26px,9cqw,46px)', lineHeight: 1, textAlign: 'center', whiteSpace: 'nowrap', margin: '8px 0 6px', filter: 'url(#mg-ink)' }}>THE SUPPLOCK GAZETTE</div>
        <div style={{ height: 5, borderTop: '2px solid #2e0f38', borderBottom: '1px solid #2e0f38' }} />
        <div style={{ fontFamily: PLAYFAIR, fontWeight: 900, fontSize: 22, lineHeight: 1.15, textAlign: 'center', padding: '10px 4px 9px', textWrap: 'balance' }}>{miniHeadline(data)}</div>
        <div style={{ borderTop: '1px solid #2e0f38' }} />
        <div style={{ overflow: 'hidden' }}><div style={{ display: 'flex', flexWrap: 'wrap', margin: '-1px -14px 0 -15px' }}>
          <div style={{ ...cell, flex: '1.5 1 250px', padding: '12px 14px 6px' }}>
            <h3 style={{ fontFamily: PLAYFAIR, fontWeight: 900, fontSize: 19, margin: '0 0 2px' }}>Today&apos;s To-Do</h3>
            {shown.slice(0, 5).map(t => {
              const it = t.item_id ? data.items.find(i => i.id === t.item_id) : undefined;
              return (
                <button key={t.id} aria-pressed={t.done} disabled={busy}
                  onClick={() => run(() => setTodoDone(t.id, !t.done), () => { if (!t.done) setRecent(r => [...r, t.id]); })}
                  style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', minHeight: 44, background: 'none', border: 'none', borderBottom: '1px solid #b9a796', padding: '11px 0 9px', textAlign: 'left', cursor: 'pointer', fontFamily: SERIF, color: '#2e0f38' }}>
                  <span style={{ position: 'relative', flex: 'none', width: 20, height: 20, marginTop: -1, border: '2px solid #2e0f38', borderRadius: '2px 4px 1px 5px / 4px 1px 5px 2px', transform: 'rotate(-2deg)', filter: 'url(#mg-ink)' }}>
                    {t.done && <span style={{ position: 'absolute', left: 3, top: -9, fontFamily: 'var(--font-hand)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </span>
                  <Icon name={it?.icon} label={it?.name || t.text} size={40} tint style={{ margin: '-10px 0 -8px' }} />
                  <span style={{ flex: 1, fontSize: 16, lineHeight: 1.3, textDecoration: t.done ? 'line-through' : 'none', textDecorationThickness: 2 }}>{t.auto ? '✶ ' : ''}{t.text}</span>
                  {t.done && <span aria-hidden="true" style={{ flex: 'none', alignSelf: 'center', fontFamily: ANTON, fontSize: 12, letterSpacing: '.14em', color: '#8a3f90', border: '2px solid #b45dbb', borderRadius: 4, padding: '1px 6px', transform: 'rotate(-8deg)', filter: 'url(#mg-ink)' }}>DONE</span>}
                </button>
              );
            })}
            {shown.length === 0 && <div style={{ fontStyle: 'italic', fontSize: 15, padding: '10px 0' }}>Nothing on the docket today.</div>}
            {shown.length > 5 && <div style={{ fontStyle: 'italic', fontSize: 14, padding: '6px 0 0' }}>+{shown.length - 5} more inside</div>}
            <form onSubmit={e => { e.preventDefault(); run(() => addTodo(draft), () => setDraft('')); }} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, margin: '14px 0 6px', flexWrap: 'wrap' }}>
              <label style={{ flex: '1 1 200px', display: 'flex', alignItems: 'flex-end', gap: 8, fontSize: 14, fontWeight: 700, fontStyle: 'italic', whiteSpace: 'nowrap' }}>Place a classified:
                <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={300} placeholder="call vendor, count cart B…"
                  style={{ flex: 1, minWidth: 0, height: 40, border: 'none', borderBottom: '2px dotted #2e0f38', background: 'transparent', fontFamily: SERIF, fontSize: 16, fontWeight: 400, fontStyle: 'normal', color: '#2e0f38', padding: '0 2px' }} />
              </label>
              <button type="submit" disabled={busy || !draft.trim()} style={{ minHeight: 44, padding: '0 16px', border: '3px double #8a3f90', borderRadius: 6, background: 'transparent', color: '#8a3f90', fontFamily: ANTON, fontSize: 17, letterSpacing: '.12em', cursor: 'pointer', transform: 'rotate(-3deg)' }}>ADD</button>
            </form>
            <ErrorText>{err}</ErrorText>
          </div>
          <div style={{ ...cell, flex: '1 1 170px', padding: '12px 14px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ fontFamily: PLAYFAIR, fontWeight: 900, fontSize: 17, margin: '0 0 4px' }}>Stop the Presses!</h3>
              {low.slice(0, 4).map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px dotted #2e0f38', fontSize: 15 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name={i.icon} label={i.name} size={40} tint />{i.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: level(i) === 'low' ? '#2e0f38' : '#8c1c45' }}>{i.qty}</span>
                </div>
              ))}
              {low.length === 0 && <div style={{ fontStyle: 'italic', fontSize: 14 }}>Shelves are full.</div>}
            </div>
            {want && (
              <div style={{ border: '4px double #2e0f38', padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontFamily: ANTON, fontSize: 13, letterSpacing: '.16em' }}>WANTED</div>
                <div style={{ fontSize: 15, lineHeight: 1.3, marginTop: 2 }}>{want.name} ×{want.qty}{want.needed_by ? ' · needed by ' + fmtDate(want.needed_by).split(', ')[1] : ''}</div>
              </div>
            )}
            <div style={{ borderTop: '2px solid #2e0f38', borderBottom: '2px solid #2e0f38', padding: '8px 2px', textAlign: 'center', fontStyle: 'italic', fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>“Supplies, locked in.”</div>
          </div>
        </div></div>
        <div style={{ height: 5, borderTop: '1px solid #2e0f38', borderBottom: '2px solid #2e0f38', marginTop: 2 }} />
        <Link href="/admin/gazette" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: 44, paddingTop: 6, textDecoration: 'none', color: '#2e0f38', fontFamily: ANTON, fontSize: 16, letterSpacing: '.14em' }}>
          <span aria-hidden="true" style={{ fontSize: 20 }}>✱ ✱</span>CONTINUE IN THE GAZETTE →<span aria-hidden="true" style={{ fontSize: 20 }}>✱ ✱</span>
        </Link>
      </div>
    </section>
  );
}

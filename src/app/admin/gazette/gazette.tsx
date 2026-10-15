'use client';
import Link from 'next/link';
import { useState, useTransition, type CSSProperties, type KeyboardEvent } from 'react';
import { approve, deny, markOrdered, markReceived } from '@/app/admin/actions';
import { placeReorder, receiveReorder, setReorderPacks } from '@/app/admin/inventory/actions';
import { returnLaptop } from '@/app/admin/laptops/actions';
import { Icon } from '@/components/icon';
import { When } from '@/components/when';
import { LEVEL, fmtDate, isoPlus, level, packPlural, reqTitle, statusOf, suggest } from '@/lib/format';
import { addTodo, deleteTodo, editTodo, setTodoDone } from './actions';
import { pickLead } from './lead';
import type { GRequest, GTodo, GazetteData } from './types';

// Paper textures from the design (inline SVG noise, no image files).
const PAPER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.006 .012' numOctaves='3' seed='3'/%3E%3CfeDiffuseLighting lighting-color='%23f4ecdf' surfaceScale='2.2'%3E%3CfeDistantLight azimuth='45' elevation='58'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)' opacity='.55'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 .18 0 0 0 0 .06 0 0 0 0 .22 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const POSTER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 .18 0 0 0 0 .06 0 0 0 0 .22 0 0 0 .1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const ANTON = 'var(--font-anton), Impact, sans-serif';
const SERIF = 'var(--font-old-standard), Georgia, serif';
const PLAYFAIR = 'var(--font-playfair), var(--font-old-standard), serif';
const MONO = 'var(--font-mono)';
const SANS = 'var(--font-sans)';

const h3: CSSProperties = { fontFamily: ANTON, fontWeight: 400, fontSize: 34, lineHeight: 1, margin: 0, textTransform: 'uppercase' };
const rule = (m: string): CSSProperties => ({ height: 5, borderTop: '2px solid #2e0f38', borderBottom: '1px solid #2e0f38', margin: m });
const inkBtn: CSSProperties = { minHeight: 44, padding: '0 14px', border: '2px solid #2e0f38', background: '#2e0f38', color: '#efe6d6', fontFamily: SANS, fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const stamp = (c: string, rot: number, size = 19): CSSProperties => ({ flex: 1, minHeight: 48, border: `4px double ${c}`, borderRadius: 8, background: 'transparent', color: c, fontFamily: ANTON, fontSize: size, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', transform: `rotate(${rot}deg)` });
const textLink: CSSProperties = { background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#4a2f55', textDecoration: 'underline', cursor: 'pointer' };
const corners = ['top:4px;left:6px', 'top:4px;right:6px', 'bottom:4px;left:6px', 'bottom:4px;right:6px'].map(s => Object.fromEntries(s.split(';').map(p => p.split(':'))) as CSSProperties);

export function Gazette({ data }: { data: GazetteData }) {
  const [toast, setToast] = useState('');
  const [busy, start] = useTransition();
  const say = (msg: string) => { setToast(msg); setTimeout(() => setToast(t => (t === msg ? '' : t)), 3200); };
  const run = (fn: () => Promise<{ error?: string }>, ok?: string) => start(async () => { const r = await fn(); say(r.error || ok || ''); });

  const L = pickLead(data);
  const lows = data.items.filter(i => level(i) !== 'ok');
  const onOrder = (id: string) => data.reorders.find(o => o.item_id === id);
  const pending = data.requests.filter(r => r.status === 'pending' && r.kind !== 'custom').sort((a, b) => a.created_at.localeCompare(b.created_at));
  const customs = data.requests.filter(r => r.kind === 'custom').slice(0, 12);
  const free = data.laptops.filter(l => l.status === 'available').length;
  const outL = data.laptops.filter(l => l.status === 'out');

  return (
    <div style={{ padding: '20px 20px 60px', background: '#d9cfe0', fontFamily: SERIF, color: '#2e0f38', minHeight: '100vh' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="2.6" numOctaves="1" seed="9" result="specks" />
          <feColorMatrix in="specks" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.2 0 0 0 2.15" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
      </svg>

      <article className="gazette" style={{ position: 'relative', containerType: 'inline-size', maxWidth: 1180, margin: '0 auto', padding: '44px 52px 40px', borderRadius: 20, backgroundColor: '#efe6d6', backgroundImage: PAPER, backgroundBlendMode: 'multiply', boxShadow: 'inset 0 0 140px rgba(78,40,70,.28),inset 0 0 30px rgba(78,40,70,.12),0 30px 60px rgba(46,15,56,.25),0 4px 10px rgba(46,15,56,.15)' }}>
        {/* masthead */}
        <h1 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: L.urgent ? 'min(164px,14.6cqw)' : 'min(122px,10.6cqw)', whiteSpace: 'nowrap', lineHeight: L.urgent ? 0.92 : 0.95, textAlign: 'center', letterSpacing: '.01em', filter: 'url(#ink)', margin: L.urgent ? '-6px 0 0' : 0 }}>
          {L.urgent ? 'EXTRA!! EXTRA!!' : 'THE SUPPLOCK GAZETTE'}
        </h1>
        <div style={{ height: 15, borderTop: '2px solid #2e0f38', borderBottom: '2px solid #2e0f38', display: 'flex', alignItems: 'center', marginTop: 16 }}><div style={{ height: 6, width: '100%', background: '#2e0f38' }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 4px', fontSize: 15, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          <span>Vol. 1, No. <When f="issue" /></span><span><When f="dateline" /></span><span>School Edition · Price: free</span>
        </div>
        <div style={{ height: 8, borderTop: '5px solid #2e0f38', borderBottom: '2px solid #2e0f38' }} />
        <div style={{ fontFamily: ANTON, fontSize: 'min(60px,6cqw)', lineHeight: 1.05, textAlign: 'center', textTransform: 'uppercase', padding: '14px 0 12px', textWrap: 'balance' }}>{L.urgent ? L.sub : 'All the news from the supply closet'}</div>
        <div style={{ height: 8, borderTop: '2px solid #2e0f38', borderBottom: '5px solid #2e0f38' }} />

        {/* lead story */}
        <div style={{ overflow: 'hidden', borderBottom: '2px solid #2e0f38' }}><div style={{ display: 'flex', flexWrap: 'wrap', margin: '-2px -26px 0 -28px' }}>
          <div style={{ flex: '2 1 520px', padding: '22px 26px', borderLeft: '2px solid #2e0f38', borderTop: '2px solid #2e0f38' }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a3f90' }}>Lead story · {L.kicker}</div>
            <h2 style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 46, lineHeight: 1, margin: '6px 0 16px', textTransform: 'uppercase', textWrap: 'balance' }}>{L.headline}</h2>
            <div style={{ position: 'relative', border: '2px solid #2e0f38', padding: '34px 18px 26px', background: 'rgba(46,15,56,.05)' }}>
              {L.kind === 'poster' && L.item && <Poster L={L} busy={busy} onOrder={(id, packs, name) => run(() => placeReorder(id, packs), 'Marked ordered: ' + name)} />}
              {L.kind === 'ad' && L.request && (
                <div style={{ position: 'relative', maxWidth: 460, margin: '0 auto', transform: 'rotate(-1.5deg)' }}>
                  <div aria-hidden="true" style={{ position: 'absolute', top: -15, left: '50%', marginLeft: -55, width: 110, height: 28, background: 'rgba(214,196,226,.78)', transform: 'rotate(3deg)', zIndex: 2, boxShadow: '0 1px 2px rgba(46,15,56,.12)' }} />
                  <div style={{ backgroundColor: '#f4ebda', backgroundImage: POSTER, padding: 10, boxShadow: '0 10px 22px rgba(46,15,56,.22),0 2px 4px rgba(46,15,56,.12)' }}>
                    <div style={{ position: 'relative', border: '4px double #2e0f38', padding: '16px 18px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      {corners.map((c, i) => <span key={i} aria-hidden="true" style={{ position: 'absolute', fontSize: 14, lineHeight: 1, ...c }}>✦</span>)}
                      <Icon label={L.request.name} size={150} variant="detail" tint />
                      <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontFamily: ANTON, fontSize: 48, lineHeight: 0.95, filter: 'url(#ink)' }}>WANTED</div>
                        <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.25 }}>{L.request.name} ×{L.request.qty}</div>
                        <div style={{ fontVariant: 'small-caps', textTransform: 'lowercase', fontWeight: 700, fontSize: 16, letterSpacing: '.08em', lineHeight: 1.3 }}>Needed by {fmtDate(L.request.needed_by) || 'no date given'}</div>
                        <div style={{ fontSize: 14 }}>For {L.request.teacher}{L.request.room ? ', ' + L.request.room : ''}</div>
                        {L.request.url && <a href={L.request.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, wordBreak: 'break-all' }}>{L.request.url.replace(/^https?:\/\/(www\.)?/, '')}</a>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {L.kind === 'clear' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                  <Icon name="shelf" size={180} variant="detail" tint />
                  <div style={{ fontFamily: ANTON, fontSize: 24, letterSpacing: '.16em', color: '#2f4f60', border: '4px double #4d7b93', borderRadius: 6, padding: '4px 16px', transform: 'rotate(-3deg)' }}>ALL CLEAR</div>
                </div>
              )}
            </div>
            <div style={{ fontStyle: 'italic', fontSize: 15, marginTop: 10, color: '#4a2f55' }}>
              {L.caption ?? <>{L.item?.name}, last seen {L.lastSeen ? <When ts={L.lastSeen.ts} f="ago" /> : 'a while ago'}.</>}
            </div>
          </div>
          <div style={{ flex: '1 1 300px', borderLeft: '2px solid #2e0f38', borderTop: '2px solid #2e0f38', padding: '22px 26px', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: 17, lineHeight: 1.5, textAlign: 'justify', hyphens: 'auto', margin: 0 }}>
              <span style={{ float: 'left', fontFamily: ANTON, fontSize: 68, lineHeight: 0.82, padding: '6px 8px 0 0' }}>{L.cap}</span>{L.body}
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, border: '2px solid #2e0f38', padding: '8px 12px' }}>{L.stat}</span>
              <span style={{ fontFamily: 'var(--font-hand)', fontSize: 24, fontWeight: 700, color: '#8a3f90', transform: 'rotate(-3deg)' }}>{L.note}</span>
            </div>
          </div>
        </div></div>

        {/* three columns */}
        <div style={{ overflow: 'hidden', borderBottom: '2px solid #2e0f38' }}><div style={{ display: 'flex', flexWrap: 'wrap', margin: '-1.5px -24px 0 -25.5px' }}>
          <Todos todos={data.todos} items={data.items} say={say} />

          {/* col B: stop the presses + deliveries */}
          <section aria-labelledby="stp" style={{ flex: '1 1 300px', borderLeft: '1.5px solid #2e0f38', borderTop: '1.5px solid #2e0f38', padding: '22px 24px 26px' }}>
            <h3 id="stp" style={h3}>Stop the Presses!</h3>
            <div style={rule('8px 0 10px')} />
            <div style={{ fontStyle: 'italic', fontSize: 14, color: '#4a2f55', marginBottom: 4 }}>Low-stock bulletin. Links open your saved product pages; checkout stays with you.</div>
            {lows.map(it => {
              const ro = onOrder(it.id), lv = level(it), sg = suggest(it);
              return (
                <div key={it.id} style={{ padding: '12px 0', borderBottom: '1px solid #2e0f38' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 19 }}><Icon name={it.icon} label={it.name} size={40} tint />{it.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, padding: '2px 7px', color: lv === 'low' ? '#2e0f38' : '#fff', background: lv === 'low' ? '#e7c4ea' : '#8c1c45', whiteSpace: 'nowrap' }}>{LEVEL[lv].label}</span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 13, margin: '4px 0 6px' }}>{it.qty} {it.unit} left · low at {it.low_threshold}</div>
                  <div style={{ fontSize: 15, lineHeight: 1.4 }}>{sg.text}{it.vendor && <> from {it.url ? <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2e0f38' }}>{it.vendor}</a> : it.vendor}</>}</div>
                  {ro ? <div style={{ fontStyle: 'italic', fontSize: 14, marginTop: 6, color: '#2f4f60' }}>On order · arrives {fmtDate(ro.eta)}</div>
                    : <button disabled={busy} onClick={() => run(() => placeReorder(it.id, sg.packs), 'Marked ordered: ' + it.name)} style={{ ...inkBtn, marginTop: 8 }}>Mark as ordered</button>}
                </div>
              );
            })}
            {lows.length === 0 && <div style={{ fontFamily: 'var(--font-hand)', fontSize: 26, color: '#2f4f60', padding: '16px 0' }}>Shelves are full. Nothing to report ★</div>}

            <h3 style={{ ...h3, fontSize: 28, marginTop: 30 }}>Deliveries Expected</h3>
            <div style={rule('8px 0 4px')} />
            {data.reorders.map(o => {
              const it = data.items.find(i => i.id === o.item_id);
              return it ? <Delivery key={o.id} title={it.name} eta={o.eta} sub={`${o.packs} ${packPlural(it.pack_name, o.packs)} × ${it.pack_size} ${it.unit}${it.vendor ? ' · ' + it.vendor : ''}`}
                packs={o.packs} unitsPer={it.pack_size} unit={it.unit} cta="Received" busy={busy}
                setPacks={n => run(() => setReorderPacks(o.id, n))} receive={n => run(() => receiveReorder(o.id, n), 'Received and added to stock')} /> : null;
            })}
            {data.requests.filter(r => r.kind === 'custom' && r.status === 'ordered').map(r => (
              <Delivery key={r.id} title={`${r.name} ×${r.qty}`} eta={r.eta} sub={`Custom request for ${r.teacher}`} cta="Delivered" busy={busy}
                receive={() => run(() => markReceived(r.id), `${r.teacher} notified: ${r.name} is ready for pickup`)} />
            ))}
            {data.reorders.length === 0 && !data.requests.some(r => r.kind === 'custom' && r.status === 'ordered') && <div style={{ fontStyle: 'italic', fontSize: 15, padding: '12px 0' }}>No packages on the way.</div>}
          </section>

          {/* col C: pending + laptops */}
          <section aria-labelledby="pend" style={{ flex: '1 1 300px', borderLeft: '1.5px solid #2e0f38', borderTop: '1.5px solid #2e0f38', padding: '22px 24px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h3 id="pend" style={h3}>Pending Requests</h3>
              <span style={{ fontFamily: ANTON, fontSize: 40, lineHeight: 1, color: '#8a3f90' }}>{pending.length}</span>
            </div>
            <div style={rule('8px 0 4px')} />
            {pending.map(r => <PendingRow key={r.id} r={r} avail={r.kind === 'laptop' ? free : data.items.find(i => i.id === r.item_id)?.qty ?? 0} say={say} />)}
            {pending.length === 0 && <div style={{ fontFamily: 'var(--font-hand)', fontSize: 26, color: '#2f4f60', padding: '16px 0' }}>Inbox zero. Go get a coffee ★</div>}

            <h3 style={{ ...h3, fontSize: 28, marginTop: 30 }}>Laptop Report</h3>
            <div style={rule('8px 0 12px')} />
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1.5px solid #2e0f38', margin: 0 }}>
              {([[free, 'Available'], [outL.length, 'Checked out'], [data.laptops.filter(l => l.status === 'assigned').length, 'In classrooms'], [data.laptops.filter(l => l.zoom).length, 'Zoom installed']] as const).map(([n, label], i) => (
                <div key={label} style={{ padding: '10px 12px', borderRight: i % 2 === 0 ? '1.5px solid #2e0f38' : undefined, borderBottom: i < 2 ? '1.5px solid #2e0f38' : undefined, display: 'flex', flexDirection: 'column-reverse' }}>
                  <dt style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</dt>
                  <dd style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, margin: 0 }}>{n}</dd>
                </div>
              ))}
            </dl>
            {outL.length > 0 && (
              <button disabled={busy} onClick={() => run(() => returnLaptop(outL[0].id), outL[0].tag + ' returned')} style={{ ...textLink, marginTop: 10, minHeight: 44, fontSize: 15, color: '#2e0f38', textDecorationColor: '#b45dbb' }}>
                Mark one checked-out laptop returned ({outL[0].tag})
              </button>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', margin: '12px 0 4px' }}>Assigned to classrooms</div>
            {data.laptops.filter(l => l.status === 'assigned').map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px dotted #2e0f38', fontSize: 15 }}>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14 }}>{l.tag}</span>
                <span style={{ flex: 1 }}>{l.room || 'No room'} · {l.holder || 'Former teacher'}</span>
                <button disabled={busy} onClick={() => run(() => returnLaptop(l.id), l.tag + ' returned')} aria-label={`${l.tag} returned`} style={{ ...textLink, minHeight: 40, fontSize: 13 }}>returned</button>
              </div>
            ))}
            {!data.laptops.some(l => l.status === 'assigned') && <div style={{ fontStyle: 'italic', fontSize: 14 }}>None right now.</div>}
          </section>
        </div></div>

        {/* classifieds + wire */}
        <div style={{ overflow: 'hidden' }}><div style={{ display: 'flex', flexWrap: 'wrap', margin: '-2px -26px 0 -28px' }}>
          <section aria-labelledby="cls" style={{ flex: '2 1 520px', padding: '22px 26px 24px', borderLeft: '2px solid #2e0f38', borderTop: '2px solid #2e0f38' }}>
            <h3 id="cls" style={h3}>Classifieds</h3>
            <div style={rule('8px 0 12px')} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
              {customs.map(c => <Classified key={c.id} c={c} say={say} />)}
            </div>
            {customs.length === 0 && <div style={{ fontStyle: 'italic', fontSize: 15 }}>No custom requests yet.</div>}
          </section>
          <section aria-labelledby="wire" style={{ flex: '1 1 300px', borderLeft: '2px solid #2e0f38', borderTop: '2px solid #2e0f38', padding: '22px 26px 24px' }}>
            <h3 id="wire" style={h3}>The Latest Wire</h3>
            <div style={rule('8px 0 4px')} />
            {data.log.slice(0, 5).map(e => (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10, padding: '9px 0', borderBottom: '1px dotted #2e0f38' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, paddingTop: 2 }}><When ts={e.ts} f="time" /></span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a3f90' }}>{e.action}</div>
                  <div style={{ fontSize: 15, lineHeight: 1.35 }}>{[e.teacher_name, e.item_label, e.qty !== '' ? '× ' + e.qty : '', e.room].filter(Boolean).join(' · ')}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: '#4a2f55' }}>{e.result}</div>
                </div>
              </div>
            ))}
            {data.log.length === 0 && <div style={{ fontStyle: 'italic', fontSize: 15, padding: '10px 0' }}>Nothing on the wire yet.</div>}
            <div style={{ fontFamily: 'var(--font-hand)', fontSize: 22, color: '#8a3f90', marginTop: 10, transform: 'rotate(-2deg)' }}>every move, on the record ↓</div>
          </section>
        </div></div>

        {/* footer */}
        <div style={{ height: 15, borderTop: '2px solid #2e0f38', borderBottom: '2px solid #2e0f38', display: 'flex', alignItems: 'center' }}><div style={{ height: 6, width: '100%', background: '#2e0f38' }} /></div>
        <nav aria-label="More" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '14px 0', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: ANTON, fontSize: 40, lineHeight: 1, filter: 'url(#ink)' }} aria-hidden="true">✱</span>
          <Link href="/admin/log" style={{ fontFamily: ANTON, fontSize: 30, letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none', color: '#2e0f38' }}>Full transaction log</Link>
          <span style={{ fontFamily: ANTON, fontSize: 30 }} aria-hidden="true">·</span>
          <Link href="/admin/inventory" style={{ fontFamily: ANTON, fontSize: 30, letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none', color: '#2e0f38' }}>Inventory</Link>
          <span style={{ fontFamily: ANTON, fontSize: 40, lineHeight: 1, filter: 'url(#ink)' }} aria-hidden="true">✱</span>
        </nav>
        <div style={{ height: 8, borderTop: '2px solid #2e0f38', borderBottom: '5px solid #2e0f38' }} />
      </article>

      <div role="status" style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 20, display: toast ? 'block' : 'none', background: '#2e0f38', color: '#f6f1f8', padding: '14px 22px', borderRadius: 14, fontFamily: SANS, fontWeight: 700, fontSize: 15, boxShadow: '0 6px 0 #1a0621,0 14px 30px rgba(46,15,56,.3)', maxWidth: '90vw' }}>{toast}</div>
    </div>
  );
}

function Poster({ L, busy, onOrder }: { L: ReturnType<typeof pickLead>; busy: boolean; onOrder: (id: string, packs: number, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const it = L.item!;
  const sg = suggest(it);
  const arriving = !!L.onOrderEta;
  const big = (L.title || '').length <= 13;
  const posterStamp: CSSProperties = { border: '4px double #b45dbb', borderRadius: 8, background: 'transparent', color: '#8a3f90', fontFamily: ANTON, fontSize: L.stampBig ? 22 : 16, letterSpacing: '.12em', cursor: 'pointer', transform: 'rotate(-4deg)', minHeight: L.stampBig ? 52 : 44, padding: L.stampBig ? '0 18px' : '0 12px' };
  return (
    <div style={{ position: 'relative', maxWidth: 440, margin: '0 auto', transform: 'rotate(-1.5deg)' }}>
      <div aria-hidden="true" style={{ position: 'absolute', top: -15, left: '50%', marginLeft: -55, width: 110, height: 28, background: 'rgba(214,196,226,.78)', transform: 'rotate(3deg)', zIndex: 2, boxShadow: '0 1px 2px rgba(46,15,56,.12)' }} />
      <div style={{ backgroundColor: '#f4ebda', backgroundImage: POSTER, padding: 12, boxShadow: '0 10px 22px rgba(46,15,56,.22),0 2px 4px rgba(46,15,56,.12)' }}>
        <div style={{ position: 'relative', border: '4px double #2e0f38', padding: '18px 18px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {corners.map((c, i) => <span key={i} aria-hidden="true" style={{ position: 'absolute', fontSize: 14, lineHeight: 1, ...c }}>✦</span>)}
          <div style={{ fontFamily: ANTON, fontSize: big ? 84 : 46, lineHeight: big ? 0.92 : 1, letterSpacing: big ? '.02em' : '.01em', filter: 'url(#ink)', textWrap: 'balance', textTransform: 'uppercase' }}>{L.title}</div>
          <div style={{ width: '72%', height: 5, borderTop: '2px solid #2e0f38', borderBottom: '1px solid #2e0f38' }} />
          <Icon name={it.icon} label={it.name} size={220} variant="detail" tint />
          {L.only && <div style={{ fontFamily: PLAYFAIR, fontWeight: 900, fontSize: 26, lineHeight: 1.1 }}>{L.only}</div>}
          <div style={{ fontVariant: 'small-caps', textTransform: 'lowercase', fontWeight: 700, fontSize: 16, letterSpacing: '.08em', lineHeight: 1.3 }}>
            Last seen: {L.lastSeen ? <When ts={L.lastSeen.ts} f="stamp" /> : 'not on record'}
          </div>
          {L.lastSeen && (L.lastSeen.teacher_name || L.lastSeen.room) && (
            <div style={{ fontVariant: 'small-caps', textTransform: 'lowercase', fontWeight: 700, fontSize: 16, letterSpacing: '.08em', lineHeight: 1.3 }}>
              Last known whereabouts: {[L.lastSeen.teacher_name, L.lastSeen.room].filter(Boolean).join(', ')}
            </div>
          )}
          <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>{L.details}</div>
          <div style={{ width: '100%', height: 5, borderTop: '1px solid #2e0f38', borderBottom: '2px solid #2e0f38', marginTop: 4 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: ANTON, fontSize: 17, letterSpacing: '.08em', textAlign: 'left' }}>REWARD: A FULLY STOCKED SHELF</span>
            {arriving ? <span style={{ border: '4px double #4d7b93', borderRadius: 8, color: '#2f4f60', fontFamily: ANTON, fontSize: 18, letterSpacing: '.12em', padding: '6px 14px', transform: 'rotate(-4deg)' }}>ON ORDER</span>
              : <button onClick={() => setOpen(true)} aria-expanded={open} style={posterStamp}>ORDER MORE</button>}
          </div>
          {open && !arriving && (
            <div style={{ width: '100%', border: '1.5px solid #2e0f38', background: 'rgba(255,250,240,.7)', padding: '12px 14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{sg.text}{it.vendor ? ' from ' + it.vendor : ''}</div>
              <div style={{ fontSize: 14 }}>Check out on the vendor&apos;s site, then mark it ordered here.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, padding: '10px 0', color: '#2e0f38' }}>Open {it.vendor || 'product'} page ↗</a>}
                <button disabled={busy} onClick={() => { onOrder(it.id, sg.packs, it.name); setOpen(false); }} style={inkBtn}>Mark as ordered</button>
                <button onClick={() => setOpen(false)} style={{ ...textLink, minHeight: 44, color: '#2e0f38', fontSize: 14 }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Todos({ todos, items, say }: { todos: GTodo[]; items: GazetteData['items']; say: (m: string) => void }) {
  const [draft, setDraft] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) => start(async () => { const r = await fn(); if (r.error) say(r.error); else after?.(); });
  const open = todos.filter(t => !t.done), done = todos.filter(t => t.done);
  const save = () => run(() => editTodo(editId!, editText), () => setEditId(null));
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') setEditId(null); };
  const box: CSSProperties = { width: 24, height: 24, border: '2.5px solid #2e0f38', borderRadius: '4px 7px 3px 8px / 7px 3px 8px 4px', transform: 'rotate(-3deg)', display: 'block' };
  const iconFor = (t: GTodo) => { const it = t.item_id ? items.find(i => i.id === t.item_id) : undefined; return it ? { name: it.icon, label: it.name } : { name: null, label: t.text }; };

  return (
    <section aria-labelledby="todo" style={{ flex: '1.15 1 320px', padding: '22px 24px 26px', borderLeft: '1.5px solid #2e0f38', borderTop: '1.5px solid #2e0f38', opacity: busy ? 0.85 : 1 }}>
      <h3 id="todo" style={{ ...h3, letterSpacing: '.01em' }}>Today&apos;s To-Do</h3>
      <div style={rule('8px 0 6px')} />
      <div style={{ fontStyle: 'italic', fontSize: 14, marginBottom: 6, color: '#4a2f55' }}>{open.length} items on the docket · auto-filed items marked ✶</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {open.map(t => (
          <li key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px dashed #a48fae' }}>
            <button onClick={() => run(() => setTodoDone(t.id, true))} aria-label={`Mark done: ${t.text}`} style={{ flex: 'none', width: 44, height: 44, margin: '-6px 0 -6px -8px', background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>
              <span style={{ ...box, filter: 'url(#ink)' }} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editId === t.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={key} maxLength={300} aria-label="Edit task"
                    style={{ flex: 1, minWidth: 0, height: 40, border: 'none', borderBottom: '2px solid #2e0f38', background: 'transparent', fontSize: 17, fontFamily: SERIF, color: '#2e0f38' }} />
                  <button onClick={save} style={{ ...inkBtn, minHeight: 40, height: 40, padding: '0 12px', fontSize: 13 }}>Save</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 17, lineHeight: 1.3 }}>
                    <Icon {...iconFor(t)} size={40} tint style={{ margin: '-8px 0 -6px' }} />
                    <span>{t.auto ? '✶ ' : ''}{t.text}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, marginTop: 3, color: '#4a2f55' }}>
                    {t.due && <span>Needed by {fmtDate(t.due)}</span>}
                    {t.link && <a href={t.link} target="_blank" rel="noopener noreferrer" style={{ color: '#2e0f38' }}>product link</a>}
                    <button onClick={() => { setEditId(t.id); setEditText(t.text); }} style={textLink}>edit</button>
                    <button onClick={() => { if (confirm(`Delete "${t.text}"?`)) run(() => deleteTodo(t.id)); }} style={textLink}>delete</button>
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={e => { e.preventDefault(); run(() => addTodo(draft), () => setDraft('')); }} style={{ marginTop: 18, border: '2px solid #2e0f38', padding: '12px 14px', background: 'rgba(255,250,240,.45)' }}>
        <div style={{ fontFamily: ANTON, fontSize: 15, letterSpacing: '.12em', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid #2e0f38', paddingBottom: 6, marginBottom: 8 }}>Classified · Place a notice</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={300} placeholder="e.g. Call Sam's Club about bulk pricing" aria-label="New task"
            style={{ flex: 1, minWidth: 0, height: 44, border: 'none', borderBottom: '1.5px dotted #2e0f38', background: 'transparent', fontSize: 17, fontStyle: 'italic', fontFamily: SERIF, color: '#2e0f38' }} />
          <button type="submit" disabled={busy || !draft.trim()} style={{ height: 44, padding: '0 16px', border: '3px solid #8a3f90', borderRadius: 6, background: 'transparent', color: '#8a3f90', fontFamily: ANTON, fontSize: 17, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transform: 'rotate(-2deg)' }}>Run it</button>
        </div>
      </form>

      <button onClick={() => setShowDone(s => !s)} aria-expanded={showDone} style={{ marginTop: 16, minHeight: 44, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: SERIF, fontSize: 15, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2e0f38', display: 'flex', alignItems: 'center', gap: 8 }}>
        {showDone ? '▾' : '▸'} Done ({done.length})
      </button>
      {showDone && done.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 40 }}>
          <button onClick={() => run(() => setTodoDone(t.id, false))} aria-label={`Mark not done: ${t.text}`} style={{ flex: 'none', width: 44, height: 44, marginLeft: -8, background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, position: 'relative' }}>
            <span style={box} />
            <span style={{ position: 'absolute', fontFamily: 'var(--font-hand)', fontSize: 34, fontWeight: 700, color: '#8a3f90', top: -4, left: 12 }}>✓</span>
          </button>
          <span style={{ flex: 1, fontSize: 16, textDecoration: 'line-through', textDecorationColor: '#8a3f90', textDecorationThickness: 2, color: '#5c4766' }}>{t.text}</span>
          <button onClick={() => run(() => deleteTodo(t.id))} style={{ ...textLink, fontSize: 13, minHeight: 44 }}>delete</button>
        </div>
      ))}

      <div style={{ marginTop: 26, border: '3px double #2e0f38', padding: '20px 18px', textAlign: 'center' }}>
        <div style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 30, lineHeight: 1.15, textWrap: 'balance' }}>“Every marker, crayon and laptop — accounted for.”</div>
        <div style={{ fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 10 }}>— The Supplock Desk</div>
      </div>
    </section>
  );
}

function Delivery({ title, eta, sub, packs, unitsPer, unit, cta, busy, setPacks, receive }: {
  title: string; eta: string | null; sub: string; packs?: number; unitsPer?: number; unit?: string; cta: string; busy: boolean; setPacks?: (n: number) => void; receive: (packs: number) => void;
}) {
  const [n, setN] = useState(packs ?? 0);
  const change = (v: number) => { const x = Math.max(1, v); setN(x); setPacks?.(x); };
  const mini: CSSProperties = { width: 40, height: 40, border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#2e0f38' };
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px dashed #a48fae' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontWeight: 700, fontSize: 17 }}>{title}</span>
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtDate(eta)}</span>
      </div>
      <div style={{ fontSize: 14, color: '#4a2f55', marginTop: 2 }}>{sub}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {packs !== undefined && (
          <>
            <div role="group" aria-label={`Packs of ${title} that arrived`} style={{ display: 'flex', alignItems: 'center', border: '2px solid #2e0f38' }}>
              <button disabled={busy} onClick={() => change(n - 1)} aria-label="Fewer" style={mini}>−</button>
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>{n}</span>
              <button disabled={busy} onClick={() => change(n + 1)} aria-label="More" style={mini}>+</button>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 13 }}>= +{n * (unitsPer || 1)} {unit}</span>
          </>
        )}
        <button disabled={busy} onClick={() => receive(n)} style={{ marginLeft: 'auto', minHeight: 44, padding: '0 14px', border: '3px solid #2f4f60', borderRadius: 6, background: 'transparent', color: '#2f4f60', fontFamily: ANTON, fontSize: 16, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transform: 'rotate(-2deg)' }}>{cta}</button>
      </div>
    </div>
  );
}

function PendingRow({ r, avail, say }: { r: GRequest; avail: number; say: (m: string) => void }) {
  const [qty, setQty] = useState(r.qty);
  const [busy, start] = useTransition();
  const fixed = r.kind === 'laptop' && r.laptop_type === 'full';
  const act = (fn: () => Promise<{ error?: string }>, ok: string) => start(async () => { const res = await fn(); say(res.error || ok); });
  const mini: CSSProperties = { width: 36, height: 40, border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#2e0f38', opacity: fixed ? 0.4 : 1 };
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #2e0f38', opacity: busy ? 0.6 : 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#4a2f55' }}>{r.teacher}{r.room ? ' · ' + r.room : ''} · <When ts={r.created_at} f="time" /></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}><Icon label={reqTitle(r)} name={r.kind === 'laptop' ? 'laptop' : null} size={40} tint />{reqTitle(r)}</span>
        <div role="group" aria-label="Amount to approve" style={{ display: 'flex', alignItems: 'center', border: '2px solid #2e0f38', flex: 'none' }}>
          <button disabled={fixed || busy} onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity" style={mini}>−</button>
          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{qty}</span>
          <button disabled={fixed || busy} onClick={() => setQty(q => Math.min(999, q + 1))} aria-label="Increase quantity" style={mini}>+</button>
        </div>
      </div>
      {r.kind === 'laptop' && <div style={{ fontSize: 14, marginTop: 3 }}>{r.laptop_type === 'temp' ? `${fmtDate(r.from_date)} – ${fmtDate(r.to_date)}` : `Stays in ${r.room || 'the classroom'} until returned`}</div>}
      {qty > avail && <div style={{ display: 'inline-block', marginTop: 6, fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#fff', background: '#8c1c45', padding: '4px 8px' }}>⚠ Exceeds available stock ({avail} available)</div>}
      {r.note && <div style={{ fontStyle: 'italic', fontSize: 14, marginTop: 5 }}>“{r.note}”</div>}
      <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
        <button disabled={busy} onClick={() => act(() => approve(r.id, qty), `${r.teacher} notified: request approved`)} aria-label={`Approve ${reqTitle(r)} for ${r.teacher}`} style={stamp('#8a3f90', -3)}>Approved</button>
        <button disabled={busy} onClick={() => act(() => deny(r.id), `${r.teacher} notified: request denied`)} aria-label={`Deny ${reqTitle(r)} for ${r.teacher}`} style={stamp('#8c1c45', 2)}>Denied</button>
      </div>
    </div>
  );
}

function Classified({ c, say }: { c: GRequest; say: (m: string) => void }) {
  const [eta, setEta] = useState(() => isoPlus(7));
  const [busy, start] = useTransition();
  const s = statusOf(c);
  const act = (fn: () => Promise<{ error?: string }>, ok: string) => start(async () => { const res = await fn(); say(res.error || ok); });
  return (
    <div style={{ border: '1.5px solid #2e0f38', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5, opacity: busy ? 0.6 : 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid #2e0f38', paddingBottom: 5 }}>Wanted · Custom request</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon label={c.name} size={40} tint />
        <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>{c.name} <span style={{ fontFamily: MONO, fontSize: 14 }}>×{c.qty}</span></div>
      </div>
      <div style={{ fontSize: 14 }}>For {c.teacher}{c.room ? ', ' + c.room : ''}. Needed by {fmtDate(c.needed_by) || 'no date'}.</div>
      {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, wordBreak: 'break-all', color: '#2e0f38' }}>{c.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}</a>
        : <span style={{ fontSize: 14, fontStyle: 'italic' }}>no link</span>}
      <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, alignSelf: 'flex-start', lineHeight: 1.35, padding: '3px 8px', marginTop: 2, color: s.fg, background: c.status === 'pending' ? '#ddd0e4' : s.bg }}>
        {c.status === 'delivered' ? 'Delivered · ready for pickup' : s.label}
      </div>
      {c.status === 'pending' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button disabled={busy} onClick={() => act(() => approve(c.id, c.qty), `${c.teacher} notified: approved, pending order`)} aria-label={`Approve ${c.name}`} style={{ ...stamp('#8a3f90', -2, 16), minHeight: 44, letterSpacing: '.1em' }}>Approved</button>
          <button disabled={busy} onClick={() => act(() => deny(c.id), `${c.teacher} notified: request denied`)} aria-label={`Deny ${c.name}`} style={{ ...stamp('#8c1c45', 2, 16), minHeight: 44, letterSpacing: '.1em' }}>Denied</button>
        </div>
      )}
      {c.status === 'approved' && (
        <>
          <label htmlFor={`eta-${c.id}`} style={{ fontSize: 13, marginTop: 6 }}>Expected arrival</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id={`eta-${c.id}`} type="date" value={eta} onChange={e => setEta(e.target.value)} style={{ flex: 1, minWidth: 0, height: 44, border: '1.5px solid #2e0f38', background: 'rgba(255,250,240,.6)', padding: '0 8px', fontFamily: MONO, fontSize: 13, color: '#2e0f38' }} />
            <button disabled={busy} onClick={() => act(() => markOrdered(c.id, eta), `${c.teacher} notified: ${c.name} ordered, arriving ${fmtDate(eta)}`)} style={{ ...inkBtn, padding: '0 12px', fontSize: 13 }}>Ordered</button>
          </div>
        </>
      )}
    </div>
  );
}

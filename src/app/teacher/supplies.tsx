'use client';
import { useState, type CSSProperties } from 'react';
import { LEVEL, fmtDate, level } from '@/lib/format';
import { NoticeModal } from './notice-modal';
import { RequestModal, type CatalogItem, type ModalMode } from './request-modal';
import { Icon } from '@/components/icon';

const chip = (on: boolean): CSSProperties => ({
  minHeight: 44, padding: '0 14px', borderRadius: 999, border: `2px solid ${on ? '#2e0f38' : '#e6dbef'}`,
  background: on ? '#2e0f38' : '#fff', color: on ? '#fff' : '#2e0f38', fontSize: 14, fontWeight: 700, cursor: 'pointer'
});

export function Supplies({ items, room, laptopsFree }: { items: CatalogItem[]; room: string; laptopsFree: number }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [notice, setNotice] = useState(false);
  const cats = ['All', ...new Set(items.map(i => i.category))];
  const shown = items.filter(i => (cat === 'All' || i.category === cat) && i.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ position: 'relative', paddingRight: 120 }}>
          <sl-block deco="1" aria-hidden="true" color="lavender" tilt="-9" float="3" radius="16" style={{ position: 'absolute', right: 52, top: -6, width: 48, height: 48 }} />
          <sl-block deco="1" aria-hidden="true" mhide="1" color="teal" tilt="10" float="1" radius="12" style={{ position: 'absolute', right: 6, top: 34, width: 34, height: 34 }} />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: 0, letterSpacing: '-0.01em' }}>What do you need?</h1>
          <div style={{ fontFamily: 'var(--font-hand)', fontSize: 24, color: '#8351a8', transform: 'rotate(-1.5deg)', transformOrigin: 'left', marginTop: 2 }}>tap Request, pick a number, done</div>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', paddingBottom: 6 }}>
          <sl-block color="orchid" tilt="-4" float="0" radius="20">
            <button onClick={() => setModal({ kind: 'custom' })} style={{ minHeight: 58, padding: '0 24px', border: 'none', borderRadius: 20, background: 'none', color: 'inherit', fontWeight: 700, fontSize: 17, cursor: 'pointer' }}>+ Request something not listed</button>
          </sl-block>
          <button onClick={() => setModal({ kind: 'laptop' })} style={{ minHeight: 52, padding: '0 20px', border: 'none', borderRadius: 16, background: '#1a2c54', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 5px 0 #0f1b37' }}>Request laptops</button>
          <button onClick={() => setNotice(true)} style={{ minHeight: 52, padding: '0 20px', border: '2px solid #2e0f38', borderRadius: 16, background: '#fff', color: '#2e0f38', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 5px 0 #2e0f38' }}>Tell the office</button>
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search supplies" aria-label="Search supplies"
            style={{ flex: '1 1 240px', height: 48, border: '2px solid #e6dbef', borderRadius: 14, padding: '0 16px', background: '#fff', fontSize: 16, font: 'inherit', color: '#2e0f38' }} />
          {cats.length > 2 && (
            <div role="group" aria-label="Category" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cats.map(c => <button key={c} aria-pressed={c === cat} onClick={() => setCat(c)} style={chip(c === cat)}>{c}</button>)}
            </div>
          )}
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map(i => {
          const lv = level(i);
          const L = i.lendable
            ? (i.qty > 0 ? { label: 'Borrow & return', fg: '#2f4f60', bg: '#dce8ee' } : { label: i.back_on ? 'Borrowed · back ' + fmtDate(i.back_on) : 'All borrowed', fg: '#6e2c74', bg: '#f1dff3' })
            : LEVEL[lv === 'critical' ? 'low' : lv];
          return (
            <li key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 22, padding: '10px 12px', border: '2px solid #efe7f3', flexWrap: 'wrap' }}>
              <Icon name={i.icon} label={i.name} size={56} />
              <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{i.name}</div>
                <div style={{ fontSize: 14, color: '#5c4766' }}>{i.category}</div>
              </div>
              <span style={{ flex: 'none', fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 999, color: L.fg, background: L.bg }}>{L.label}</span>
              <button onClick={() => setModal({ kind: 'supply', item: i })} aria-label={`${i.lendable ? 'Borrow' : 'Request'} ${i.name}`}
                style={{ flex: 'none', minWidth: 130, height: 56, border: 'none', borderRadius: 18, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 5px 0 #5e3680' }}>{i.lendable ? 'Borrow' : 'Request'}</button>
            </li>
          );
        })}
      </ul>

      {shown.length === 0 && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px 44px', gap: 8 }}>
          <sl-block deco="1" aria-hidden="true" color="lavender" tilt="-10" float="2" radius="16" style={{ position: 'absolute', left: '10%', top: 22, width: 46, height: 46 }} />
          <sl-block deco="1" aria-hidden="true" color="teal" tilt="8" float="4" radius="12" style={{ position: 'absolute', right: '12%', top: 46, width: 32, height: 32 }} />
          <sl-block deco="1" aria-hidden="true" mhide="1" color="pink" tilt="6" float="1" radius="14" style={{ position: 'absolute', right: '6%', bottom: 14, width: 58, height: 24 }} />
          <Icon name="box" size={120} variant="detail" />
          <div style={{ fontFamily: 'var(--font-hand)', fontSize: 30, fontWeight: 700, color: '#5e3680' }}>
            {items.length === 0 ? 'the shelf is still empty' : 'hmm, not on the shelf'}
          </div>
          <div style={{ fontSize: 16, color: '#3d2547', maxWidth: 380 }}>
            {items.length === 0 ? "Your office hasn't added supplies yet. You can still ask for anything and they'll order it." : 'Ask for it anyway and the office will order it.'}
          </div>
          <button onClick={() => setModal({ kind: 'custom' })} style={{ marginTop: 8, minHeight: 52, padding: '0 20px', border: 'none', borderRadius: 16, background: '#a54fac', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 5px 0 #7d3484' }}>Request something not listed</button>
        </div>
      )}

      {notice && <NoticeModal onClose={() => setNotice(false)} />}
      {modal && <RequestModal key={modal.kind === 'supply' ? modal.item.id : modal.kind} mode={modal} room={room} laptopsFree={laptopsFree} onClose={() => setModal(null)} />}
    </>
  );
}

'use client';
import { useState, useTransition, type CSSProperties } from 'react';
import { ErrorText } from '@/components/form';
import { isoPlus, packPlural } from '@/lib/format';
import { linkKey, splitLinks } from '@/lib/links';
import { logOrder } from './actions';
import type { Item } from './item-panel';

type Line = { id: number; item: string; packs: number; link: string };

const btn: CSSProperties = { minHeight: 48, padding: '0 18px', border: 'none', borderRadius: 14, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680' };
const field: CSSProperties = { border: '2px solid #e6dbef', borderRadius: 12, padding: '0 10px', font: 'inherit', fontSize: 15, background: '#fff', color: '#2e0f38' };
const step: CSSProperties = { width: 36, height: 36, border: 'none', borderRadius: 9, background: '#fff', fontWeight: 700, cursor: 'pointer', color: '#2e0f38' };
let nextId = 1;

// Log an order placed on a vendor's site: pick items (or paste product links that match saved ones),
// how many of each, and when it arrives. Each line shows up under Orders until it's received.
export function OrderDialog({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const [text, setText] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [eta, setEta] = useState(() => isoPlus(5));
  const [found, setFound] = useState('');
  const [done, setDone] = useState(0);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const byId = new Map(items.map(i => [i.id, i]));
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

  const set = (id: number, patch: Partial<Line>) => setLines(ls => ls.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const add = (item = '', link = '') => setLines(ls => [...ls, { id: nextId++, item, packs: 1, link }]);

  const findItems = () => {
    const links = splitLinks(text);
    if (!links.length) return setFound('No links found. Paste one link per line.');
    const keys = new Map<string, Item>();
    for (const i of items) if (i.url && linkKey(i.url)) keys.set(linkKey(i.url), i);
    const have = new Set(lines.map(l => l.item));
    const added: Line[] = [];
    let matched = 0;
    for (const link of links) {
      const it = keys.get(linkKey(link));
      if (it) matched++;
      if (it && have.has(it.id)) continue;
      if (it) have.add(it.id);
      added.push({ id: nextId++, item: it?.id || '', packs: 1, link });
    }
    setLines(ls => [...ls, ...added]);
    setText('');
    const missing = links.length - matched;
    setFound(`Found ${matched} of ${links.length} ${links.length === 1 ? 'link' : 'links'}.` + (missing ? ` Pick the item for the ${missing === 1 ? 'one' : missing} not recognized below.` : ''));
  };

  const save = () => {
    if (!lines.length) return setErr('Add at least one item to the order.');
    if (lines.some(l => !l.item)) return setErr('Pick the item for each line, or remove the ones you don’t need.');
    setErr('');
    start(async () => {
      const r = await logOrder(lines.map(l => ({ item: l.item, packs: l.packs, link: l.link })), eta);
      if (r.error) setErr(r.error); else setDone(lines.length);
    });
  };

  return (
    <dialog className="sl-modal" aria-label="Log an order" style={{ maxWidth: 640 }} ref={el => { if (el && !el.open) el.showModal(); }}
      onClose={onClose} onClick={e => { if (e.target === e.currentTarget && !pending) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 28, padding: 24, boxShadow: '0 8px 0 #c2abd4,0 30px 60px rgba(46,15,56,.3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, margin: 0 }}>Log an order</h2>
            <div style={{ fontSize: 14, color: '#5c4766', marginTop: 4 }}>Ordered something? Add it here. Stock goes up when you mark it received.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ flex: 'none', width: 44, height: 44, borderRadius: 14, border: 'none', background: '#f1eaf5', fontSize: 20, cursor: 'pointer', color: '#2e0f38' }}>×</button>
        </div>

        {done ? (
          <>
            <div role="status" style={{ fontSize: 17, lineHeight: 1.5 }}>
              <strong>Saved.</strong> {done} {done === 1 ? 'item is' : 'items are'} now under Orders. Click <strong>Received</strong> on each one when it arrives, and the stock goes up.
            </div>
            <button type="button" autoFocus onClick={onClose} style={btn}>Close</button>
          </>
        ) : (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 }}>
              <span>Paste product links <span style={{ fontWeight: 400, color: '#5c4766' }}>optional · one per line</span></span>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder={'https://www.amazon.com/dp/…\nhttps://www.walmart.com/ip/…'}
                style={{ ...field, padding: '10px 12px', resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={findItems} disabled={!text.trim()} style={{ ...btn, background: '#1a2c54', boxShadow: '0 4px 0 #0f1b37', opacity: text.trim() ? 1 : 0.5 }}>Find items</button>
              <span role="status" style={{ fontSize: 14, color: '#5c4766', flex: 1, minWidth: 200 }}>{found || 'Links are matched to the product link saved on each item.'}</span>
            </div>

            <div style={{ borderTop: '1px solid #efe7f3', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lines.map(l => {
                const it = byId.get(l.item);
                return (
                  <div key={l.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: l.item ? '#fff' : '#f1dff3', borderRadius: 14, padding: l.item ? 0 : 8 }}>
                    <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <select value={l.item} onChange={e => set(l.id, { item: e.target.value })} aria-label="Item" style={{ ...field, height: 44 }}>
                        <option value="">Pick the item…</option>
                        {sorted.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      {l.link && <span style={{ fontSize: 12, color: '#5c4766', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.link.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                    </div>
                    <div role="group" aria-label={`How many ${it ? packPlural(it.pack_name, 2) : 'packs'}`} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1eaf5', borderRadius: 12, padding: 3 }}>
                      <button type="button" onClick={() => set(l.id, { packs: Math.max(1, l.packs - 1) })} aria-label="Fewer" style={step}>−</button>
                      <input value={l.packs} inputMode="numeric" aria-label="How many"
                        onChange={e => { const n = Number.parseInt(e.target.value.replace(/\D/g, ''), 10); set(l.id, { packs: Number.isNaN(n) ? 1 : Math.min(10000, Math.max(1, n)) }); }}
                        style={{ width: 44, border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: '#2e0f38' }} />
                      <button type="button" onClick={() => set(l.id, { packs: Math.min(10000, l.packs + 1) })} aria-label="More" style={step}>+</button>
                    </div>
                    <span style={{ fontSize: 13, color: '#5c4766', minWidth: 90 }}>{it ? `${packPlural(it.pack_name, l.packs)} · ${l.packs * it.pack_size} ${it.unit}` : ''}</span>
                    <button type="button" onClick={() => setLines(ls => ls.filter(x => x.id !== l.id))} aria-label="Remove line"
                      style={{ width: 36, height: 36, border: 'none', borderRadius: 10, background: '#f1eaf5', fontSize: 18, cursor: 'pointer', color: '#8c1c45' }}>×</button>
                  </div>
                );
              })}
              <button type="button" onClick={() => add()} disabled={!items.length}
                style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 14px', border: '2px dashed #c2abd4', borderRadius: 12, background: '#fff', color: '#5e3680', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                + Add an item
              </button>
              {!items.length && <div style={{ fontSize: 14, color: '#5c4766' }}>Add your supplies to the inventory first, then log orders for them.</div>}
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700, maxWidth: 220 }}>Expected arrival
              <input type="date" value={eta} min={isoPlus(0)} onChange={e => setEta(e.target.value)} style={{ ...field, height: 44, fontFamily: 'var(--font-mono)', fontSize: 14 }} />
            </label>
            <ErrorText>{err}</ErrorText>
            <button type="button" onClick={save} disabled={pending} style={{ ...btn, minHeight: 54, fontSize: 17, opacity: pending ? 0.7 : 1 }}>
              {pending ? 'Saving…' : lines.length > 1 ? `Save order (${lines.length} items)` : 'Save order'}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}

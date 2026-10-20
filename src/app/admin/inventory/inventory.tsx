'use client';
import { useState, useTransition, type CSSProperties } from 'react';
import { ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { LEVEL, fmtDate, isoPlus, level, money, packPlural, suggest } from '@/lib/format';
import { adjustItem, placeReorder, receiveReorder, removeItem, setReorderPacks } from './actions';
import { ImportDialog } from './import-dialog';
import { OrderDialog } from './order-dialog';
import { BLANK, ItemPanel, type Item } from './item-panel';

export type Reorder = { id: string; item_id: string | null; item_name: string; packs: number; link: string; placed_on: string; eta: string | null; status: 'ordered' | 'received'; received_packs: number | null };

type Filter = 'all' | 'low' | 'out';
const card: CSSProperties = { background: '#fff', borderRadius: 24, padding: '20px 22px', border: '2px solid #e6dbef' };
const h2: CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, margin: 0 };
const mini: CSSProperties = { width: 32, height: 32, border: 'none', borderRadius: 9, background: '#f1eaf5', fontWeight: 700, cursor: 'pointer', color: '#2e0f38' };
const smallBtn = (bg: string): CSSProperties => ({ minHeight: 44, padding: '0 14px', border: 'none', borderRadius: 12, background: bg, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' });

export function Inventory({ items, reorders }: { items: Item[]; reorders: Reorder[] }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Item | null>(null);
  const [importing, setImporting] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => { setErr(''); const r = await fn(); if (r.error) setErr(r.error); });

  const lv = (i: Item) => level(i);
  const nLow = items.filter(i => lv(i) === 'low' || lv(i) === 'critical').length;
  const nOut = items.filter(i => lv(i) === 'out').length;
  const match = (i: Item) => filter === 'all' || (filter === 'low' ? lv(i) === 'low' || lv(i) === 'critical' : lv(i) === 'out');
  const rows = items.filter(i => match(i) && i.name.toLowerCase().includes(q.trim().toLowerCase()));
  const stats: [Filter, string, number, 'purple' | 'orchid' | 'berry', string, string][] = [
    ['all', 'Total items', items.length, 'purple', '-3', '0'], ['low', 'Running low', nLow, 'orchid', '2', '2'], ['out', 'Out of stock', nOut, 'berry', '-2', '4']
  ];

  const onOrder = new Set(reorders.filter(o => o.status === 'ordered').map(o => o.item_id));
  const need = items.filter(i => lv(i) !== 'ok' && !onOrder.has(i.id));
  const vendors = [...new Set(need.map(i => i.vendor || 'No vendor set'))];
  const byId = new Map(items.map(i => [i.id, i]));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: 0 }}>Inventory</h1>
          <div style={{ fontSize: 15, color: '#5c4766', marginTop: 4 }}>Stock is counted in each item&apos;s base unit.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search items" aria-label="Search items"
            style={{ height: 48, width: 240, border: '2px solid #e6dbef', borderRadius: 14, padding: '0 14px', background: '#fff', fontSize: 15, font: 'inherit', color: '#2e0f38' }} />
          <button onClick={() => setImporting(true)} style={{ minHeight: 48, padding: '0 16px', border: '2px solid #8351a8', borderRadius: 16, background: '#fff', color: '#5e3680', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #8351a8' }}>Import from Excel</button>
          {/* The file is named with the viewer's own date, added at click time. */}
          <a href="/admin/inventory/export" download onClick={e => { e.currentTarget.href = `/admin/inventory/export?d=${isoPlus(0)}`; }}
            style={{ whiteSpace: 'nowrap', minHeight: 48, padding: '0 16px', border: '2px solid #4d7b93', borderRadius: 16, background: '#fff', color: '#2f4f60', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #4d7b93', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>Export to Excel
          </a>
          <button onClick={() => setEditing({ ...BLANK })} style={{ minHeight: 48, padding: '0 20px', border: 'none', borderRadius: 14, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680' }}>+ Add item</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', margin: '8px 0 30px' }}>
        {stats.map(([k, label, n, color, tilt, f]) => {
          const on = filter === k;
          return (
            <sl-block key={k} color={color} tilt={tilt} float={f} radius="26" style={{ flex: '1 1 180px', maxWidth: 270 }}>
              <button onClick={() => setFilter(on ? 'all' : k)} aria-pressed={on}
                style={{ width: '100%', background: 'none', border: 'none', color: 'inherit', textAlign: 'left', padding: '16px 20px', cursor: 'pointer', borderRadius: 26 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, lineHeight: 1.05 }}>{n}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{on ? (k === 'all' ? 'Showing everything' : 'Showing these · tap to clear') : 'Tap to filter'}</div>
              </button>
            </sl-block>
          );
        })}
      </div>

      <ErrorText>{err}</ErrorText>
      <div style={{ background: '#fff', borderRadius: 24, border: '2px solid #e6dbef', overflowX: 'auto', opacity: busy ? 0.85 : 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
          <thead><tr style={{ textAlign: 'left', color: '#5c4766', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            <th style={{ padding: '14px 16px' }}>Item</th><th style={{ padding: '14px 8px' }}>Stock</th><th style={{ padding: '14px 8px' }}>Low at</th><th style={{ padding: '14px 8px' }}>Pack</th>
            <th style={{ padding: '14px 8px' }}>Vendor</th><th style={{ padding: '14px 8px' }}>Price / unit</th><th style={{ padding: '14px 8px' }}>Status</th><th style={{ padding: '14px 16px' }}><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>
            {rows.map(i => {
              const L = LEVEL[lv(i)];
              return (
                <tr key={i.id} style={{ borderTop: '1px solid #efe7f3' }}>
                  <td style={{ padding: '8px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon name={i.icon} label={i.name} size={42} />
                    <div><div style={{ fontWeight: 700, fontSize: 15 }}>{i.name}</div><div style={{ fontSize: 13, color: '#5c4766' }}>{i.category}</div></div>
                  </div></td>
                  <td style={{ padding: '10px 8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => run(() => adjustItem(i.id, -1))} disabled={busy || i.qty === 0} aria-label={`Remove one ${i.name}`} style={mini}>−</button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{i.qty}</span>
                    <button onClick={() => run(() => adjustItem(i.id, 1))} disabled={busy} aria-label={`Add one ${i.name}`} style={mini}>+</button>
                    <span style={{ color: '#5c4766', marginLeft: 4 }}>{i.unit}</span>
                  </div></td>
                  <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{i.low_threshold}</td>
                  <td style={{ padding: '10px 8px' }}>1 {i.pack_name} = {i.pack_size}</td>
                  <td style={{ padding: '10px 8px' }}>{i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer">{i.vendor || 'Link'}</a> : i.vendor}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{money(Number(i.price))}</td>
                  <td style={{ padding: '10px 8px' }}><span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, color: L.fg, background: L.bg, whiteSpace: 'nowrap' }}>{L.label}</span></td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setEditing(i)} aria-label={`Edit ${i.name}`} style={{ minHeight: 36, padding: '0 12px', border: '2px solid #2e0f38', borderRadius: 10, background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#2e0f38' }}>Edit</button>
                    <button onClick={() => { if (confirm(`Remove ${i.name} from inventory?`)) run(() => removeItem(i.id)); }} aria-label={`Remove ${i.name}`}
                      style={{ minHeight: 36, padding: '0 10px', border: 'none', background: 'none', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', color: '#8c1c45' }}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px 44px', gap: 8 }}>
            <sl-block deco="1" aria-hidden="true" color="lavender" tilt="-10" float="2" radius="16" style={{ position: 'absolute', left: '10%', top: 22, width: 46, height: 46 }} />
            <sl-block deco="1" aria-hidden="true" color="teal" tilt="8" float="4" radius="12" style={{ position: 'absolute', right: '12%', top: 46, width: 32, height: 32 }} />
            <sl-block deco="1" aria-hidden="true" mhide="1" color="pink" tilt="6" float="1" radius="14" style={{ position: 'absolute', right: '6%', bottom: 14, width: 58, height: 24 }} />
            <Icon name="box" size={120} variant="detail" />
            <div style={{ fontFamily: 'var(--font-hand)', fontSize: 30, fontWeight: 700, color: '#5e3680' }}>{items.length ? 'nothing on this shelf' : 'the shelf is empty'}</div>
            <div style={{ fontSize: 16, color: '#3d2547', maxWidth: 380 }}>
              {items.length ? 'No items match. Try another search, or clear the filter above.' : 'Add your supplies one at a time with + Add item, or upload your whole list with Import from Excel.'}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 22, marginTop: 28, alignItems: 'start' }}>
        <section style={card} aria-labelledby="shop-h">
          <h2 id="shop-h" style={h2}>Shopping list</h2>
          <div style={{ fontSize: 14, color: '#5c4766', margin: '4px 0 10px' }}>Pre-filled from low stock. Open each link, check out on the vendor&apos;s site, then mark it ordered.</div>
          {vendors.map(v => (
            <div key={v} style={{ padding: '10px 0', borderTop: '1px solid #efe7f3' }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#5e3680', marginBottom: 4 }}>{v}</div>
              {need.filter(i => (i.vendor || 'No vendor set') === v).map(i => {
                const sg = suggest(i);
                return (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', flexWrap: 'wrap' }}>
                    <Icon name={i.icon} label={i.name} size={40} />
                    <div style={{ flex: 1, minWidth: 160 }}>
                      {i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>{i.name}</a> : <span style={{ fontWeight: 700 }}>{i.name}</span>}
                      <div style={{ fontSize: 14 }}>{sg.text} · ~{money(sg.units * Number(i.price))}</div>
                    </div>
                    <button disabled={busy} onClick={() => run(() => placeReorder(i.id, sg.packs))} style={smallBtn('#1a2c54')}>Mark ordered</button>
                  </div>
                );
              })}
            </div>
          ))}
          {vendors.length === 0 && <div style={{ fontFamily: 'var(--font-hand)', fontSize: 26, color: '#4d7b93' }}>nothing to buy right now ★</div>}
        </section>

        <section style={card} aria-labelledby="orders-h">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <h2 id="orders-h" style={h2}>Orders</h2>
            <button onClick={() => setOrdering(true)} style={smallBtn('#8351a8')}>+ Log an order</button>
          </div>
          {reorders.map(o => <Order key={o.id} o={o} it={o.item_id ? byId.get(o.item_id) : undefined} />)}
          {reorders.length === 0 && <div style={{ fontSize: 15, color: '#5c4766' }}>No orders yet. Mark items ordered from the shopping list, or click + Log an order for anything you bought.</div>}
        </section>
      </div>

      {editing && <ItemPanel key={editing.id || 'new'} item={editing} onClose={() => setEditing(null)} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
      {ordering && <OrderDialog items={items} onClose={() => setOrdering(false)} />}
    </>
  );
}

// An open order: change how many packs arrived (for partial deliveries), then mark it received.
function Order({ o, it }: { o: Reorder; it?: Item }) {
  const [packs, setPacks] = useState(o.packs);
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const pk = it?.pack_name || 'pack', size = it?.pack_size || 1, unit = it?.unit || '';
  const open = o.status === 'ordered';
  const change = (n: number) => {
    const next = Math.max(1, n);
    setPacks(next);
    start(async () => { const r = await setReorderPacks(o.id, next); if (r.error) setErr(r.error); });
  };
  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid #efe7f3', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 700 }}>
          {it?.name || o.item_name}{!it && <span style={{ fontWeight: 400, color: '#5c4766' }}> (removed)</span>}
          {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, marginLeft: 8 }}>link ↗</a>}
        </div>
        <div style={{ fontSize: 13, color: '#5c4766' }}>
          {open
            ? `${packs} ${packPlural(pk, packs)} × ${size} ${unit} · placed ${fmtDate(o.placed_on)}${o.eta ? ' · arrives ' + fmtDate(o.eta) : ''}`
            : `${o.received_packs} ${packPlural(pk, o.received_packs || 0)} received · placed ${fmtDate(o.placed_on)}`}
        </div>
        <ErrorText>{err}</ErrorText>
      </div>
      {open && it && (
        <>
          <div role="group" aria-label={`Packs of ${it.name} that arrived`} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1eaf5', borderRadius: 12, padding: 3 }}>
            <button onClick={() => change(packs - 1)} disabled={busy} aria-label="Fewer" style={{ width: 36, height: 36, border: 'none', borderRadius: 9, background: '#fff', fontWeight: 700, cursor: 'pointer', color: '#2e0f38' }}>−</button>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: 26, textAlign: 'center' }}>{packs}</span>
            <button onClick={() => change(packs + 1)} disabled={busy} aria-label="More" style={{ width: 36, height: 36, border: 'none', borderRadius: 9, background: '#fff', fontWeight: 700, cursor: 'pointer', color: '#2e0f38' }}>+</button>
          </div>
          <button disabled={busy} onClick={() => start(async () => { const r = await receiveReorder(o.id, packs); if (r.error) setErr(r.error); })} style={smallBtn('#4d7b93')}>
            Received +{packs * size}
          </button>
        </>
      )}
      {!open && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#e6dbef' }}>Received</span>}
    </div>
  );
}

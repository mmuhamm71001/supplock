'use client';
import { useState, useSyncExternalStore, useTransition, type CSSProperties, type FormEvent } from 'react';
import { ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { saveItem } from './actions';

export type Item = {
  id: string; name: string; category: string; unit: string; qty: number; low_threshold: number; vendor: string; url: string;
  pack_name: string; pack_size: number; price: number; icon: string | null;
};

declare global {
  interface Window { SLIcons?: { suggest: (name: string) => string | null; list: { id: string; label: string }[] } }
}
const noop = () => () => {};
const getIcons = () => window.SLIcons ?? null;

const FIELDS: { key: keyof Item; label: string; hint?: string; type: 'text' | 'number' | 'url'; step?: string; required?: boolean }[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'category', label: 'Category', hint: 'e.g. Paper, Art, Cleaning', type: 'text' },
  { key: 'unit', label: 'Base unit', hint: 'How stock is counted, e.g. ream', type: 'text' },
  { key: 'qty', label: 'Current quantity', hint: 'In base units', type: 'number' },
  { key: 'low_threshold', label: 'Low-stock threshold', hint: 'Alert when stock drops below this', type: 'number' },
  { key: 'vendor', label: 'Preferred vendor', type: 'text' },
  { key: 'url', label: 'Product link', type: 'url' },
  { key: 'pack_name', label: 'Purchase unit', hint: 'e.g. box, case, pack. Use "each" if sold individually', type: 'text' },
  { key: 'pack_size', label: 'Units per purchase', hint: 'e.g. 1 box = 10 reams', type: 'number' },
  { key: 'price', label: 'Price per base unit ($)', type: 'number', step: '0.01' }
];

export const BLANK: Omit<Item, 'id'> & { id: string } = { id: '', name: '', category: '', unit: 'each', qty: 0, low_threshold: 5, vendor: '', url: '', pack_name: 'each', pack_size: 1, price: 0, icon: null };

const input: CSSProperties = { height: 46, border: '2px solid #e6dbef', borderRadius: 12, padding: '0 12px', fontWeight: 400, fontSize: 15, font: 'inherit', color: '#2e0f38', background: '#fff' };

export function ItemPanel({ item, onClose }: { item: Item; onClose: () => void }) {
  const [f, setF] = useState(item);
  const [picked, setPicked] = useState(!!item.icon);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const icons = useSyncExternalStore(noop, getIcons, () => null);
  const auto = (icons?.suggest(f.name) || 'box');
  const selIcon = picked && f.icon ? f.icon : auto;
  const set = (k: keyof Item) => (e: React.ChangeEvent<HTMLInputElement>) => setF(x => ({ ...x, [k]: e.target.value }));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', f.id);
    fd.set('icon', picked ? (f.icon || '') : (auto === 'box' ? '' : auto));
    if (!String(fd.get('name')).trim()) return setErr('Add the item name.');
    setErr('');
    start(async () => { const r = await saveItem(fd); if (r.error) setErr(r.error); else onClose(); });
  };
  const size = Math.max(1, Number(f.pack_size) || 1);

  return (
    <dialog className="sl-drawer" aria-label={f.id ? 'Edit ' + item.name : 'Add item'} ref={el => { if (el && !el.open) el.showModal(); }}
      onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} style={{ minHeight: '100%', background: '#fff', padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, margin: 0 }}>{f.id ? 'Edit ' + item.name : 'Add item'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, border: 'none', borderRadius: 14, background: '#f1eaf5', fontSize: 20, cursor: 'pointer', color: '#2e0f38' }}>×</button>
        </div>
        {FIELDS.map(fd => (
          <label key={fd.key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 14, fontWeight: 700 }}>
            {fd.label}{fd.hint && <span style={{ fontWeight: 400, fontSize: 13, color: '#5c4766', marginTop: -4 }}>{fd.hint}</span>}
            <input name={fd.key} type={fd.type === 'url' ? 'text' : fd.type} inputMode={fd.type === 'url' ? 'url' : fd.type === 'number' ? (fd.step ? 'decimal' : 'numeric') : undefined}
              min={fd.type === 'number' ? (fd.key === 'pack_size' ? 1 : 0) : undefined} step={fd.step} required={fd.required}
              autoFocus={fd.key === 'name' && !f.id} value={String(f[fd.key] ?? '')} onChange={set(fd.key)} style={input} />
          </label>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 14, fontWeight: 700 }}>
            Icon<span style={{ fontWeight: 400, fontSize: 13, color: '#5c4766' }}>{picked ? 'tap to change' : 'auto-suggested from the name'}</span>
          </div>
          <div role="radiogroup" aria-label="Icon" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 6 }}>
            {(icons?.list || []).map(o => {
              const on = o.id === selIcon;
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => { setF(x => ({ ...x, icon: o.id })); setPicked(true); }}
                  style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 2px 6px', minHeight: 44, borderRadius: 14, border: `2px solid ${on ? '#8351a8' : '#e6dbef'}`, background: on ? '#f1dff3' : '#fff', cursor: 'pointer', fontSize: 11, lineHeight: 1.15, color: '#2e0f38', textAlign: 'center' }}>
                  <Icon name={o.id} size={44} /><span>{o.label}</span>
                  {o.id === auto && auto !== 'box' && <span style={{ position: 'absolute', top: -7, right: -4, fontSize: 10, fontWeight: 700, background: '#8351a8', color: '#fff', padding: '1px 5px', borderRadius: 6 }}>auto</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: 14, background: '#f1eaf5', borderRadius: 12, padding: '10px 12px' }}>
          1 {f.pack_name || 'each'} = {size} {f.unit || 'units'}. Receiving 2 adds {2 * size} to stock.
        </div>
        <ErrorText>{err}</ErrorText>
        <button type="submit" disabled={pending} style={{ height: 54, border: 'none', borderRadius: 16, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680', marginTop: 6, opacity: pending ? 0.7 : 1 }}>
          {pending ? 'Saving…' : 'Save item'}
        </button>
      </form>
    </dialog>
  );
}

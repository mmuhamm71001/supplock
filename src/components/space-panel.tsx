'use client';
import { useState, useTransition, type CSSProperties, type FormEvent } from 'react';
import { adjustSpaceItem, removeSpaceItem, saveCount, saveSpaceItem } from '@/app/spaces/actions';
import { isoPlus } from '@/lib/format';
import { CATS, spaceLevel, type SpaceData, type SpaceItem } from '@/lib/space-shared';
import { Day } from './day';
import { ErrorText } from './form';
import { Icon } from './icon';

type Form = { id: string | null; name: string; category: string; qty: string; unit: string; low_threshold: string; on_loan: boolean; note: string };
const blank: Form = { id: null, name: '', category: 'Supplies', qty: '1', unit: '', low_threshold: '0', on_loan: false, note: '' };

const pill = (on: boolean): CSSProperties => ({ minHeight: 40, padding: '0 13px', borderRadius: 999, border: `2px solid ${on ? '#2e0f38' : '#e6dbef'}`, background: on ? '#2e0f38' : '#fff', color: on ? '#fff' : '#2e0f38', fontSize: 14, fontWeight: 700, cursor: 'pointer' });
const input: CSSProperties = { height: 46, border: '2px solid #e6dbef', borderRadius: 12, padding: '0 12px', font: 'inherit', fontWeight: 400, fontSize: 15, background: '#fff', color: '#2e0f38' };
const label: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 14, fontWeight: 700 };
const chip: CSSProperties = { whiteSpace: 'nowrap', padding: '5px 11px', borderRadius: 999 };
const step: CSSProperties = { width: 44, height: 44, border: 'none', borderRadius: 11, background: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', color: '#2e0f38' };

// The inventory of one space. Used by the owner (My spaces) and by admins (Spaces page).
export function SpacePanel({ data, isAdmin }: { data: SpaceData; isAdmin: boolean }) {
  const { space: sp, items, counts } = data;
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState<Form | null>(null);
  const [counting, setCounting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>, done?: () => void) => start(async () => {
    setErr('');
    const r = await fn();
    if (r.error) setErr(r.error); else done?.();
  });
  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 4000); };

  const shown = items.filter(i => filter === 'All' || (filter === 'On loan' ? i.on_loan : filter === 'Low' ? spaceLevel(i) !== 'ok' : i.category === filter))
    .sort((a, b) => CATS.indexOf(a.category as typeof CATS[number]) - CATS.indexOf(b.category as typeof CATS[number]) || a.name.localeCompare(b.name));
  const nLow = items.filter(i => spaceLevel(i) !== 'ok').length;
  const num = (s: string | undefined, fallback: number) => { const n = Math.round(Number(s)); return s == null || s.trim() === '' || Number.isNaN(n) ? fallback : Math.max(0, n); };
  const changed = items.filter(i => drafts[i.id] != null && num(drafts[i.id], i.qty) !== i.qty).length;
  const idle = !counting && !form;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return setErr('Give the item a name.');
    const was = form.id;
    run(() => saveSpaceItem({
      id: form.id, space: sp.id, name: form.name, category: form.category, qty: num(form.qty, 0), unit: form.unit,
      low_threshold: num(form.low_threshold, 0), on_loan: form.on_loan, note: form.note, icon: ''
    }), () => { setForm(null); flash((was ? 'Saved ' : 'Added ') + form.name.trim()); });
  };
  const edit = (i: SpaceItem) => { setErr(''); setForm({ id: i.id, name: i.name, category: i.category, qty: String(i.qty), unit: i.unit, low_threshold: String(i.low_threshold), on_loan: i.on_loan, note: i.note }); };

  const history = counts.slice(0, 6).map((c, idx) => {
    const lines = c.lines.map(l => { const base = l.prev ?? l.expected; const dd = l.counted - base; return { ...l, base, dd }; }).filter(l => l.dd !== 0);
    return { c, lines, first: !counts[idx + 1] };
  });
  const exportHref = `/spaces/${sp.id}/export`;

  return (
    <section aria-label={sp.name} style={{ background: '#fff', border: '2px solid #e6dbef', borderRadius: 24, padding: '20px 22px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Icon space={sp.kind} label={`${sp.subject} ${sp.name}`} size={64} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#5e3680' }}>{sp.kind === 'classroom' ? 'Classroom' : (sp.subject || 'Subject') + ' space'}</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, lineHeight: 1.1, margin: '2px 0 4px' }}>{sp.name}</h2>
            <div style={{ fontSize: 14, color: '#5c4766' }}>Owner: {sp.owner}{isAdmin ? ' · you can edit this as admin' : ''}</div>
          </div>
        </div>
        {idle && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button disabled={!items.length} onClick={() => { setCounting(true); setDrafts({}); setFilter('All'); setErr(''); }}
              style={{ whiteSpace: 'nowrap', minHeight: 48, padding: '0 18px', border: 'none', borderRadius: 16, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680', opacity: items.length ? 1 : 0.5 }}>Take inventory</button>
            <a href={exportHref} download onClick={e => { e.currentTarget.href = `${exportHref}?d=${isoPlus(0)}`; }}
              style={{ whiteSpace: 'nowrap', minHeight: 48, padding: '0 16px', border: '2px solid #4d7b93', borderRadius: 16, background: '#fff', color: '#2f4f60', fontWeight: 700, fontSize: 15, boxShadow: '0 4px 0 #4d7b93', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>Export to Excel
            </a>
            <button onClick={() => { setErr(''); setForm({ ...blank }); }} style={{ whiteSpace: 'nowrap', minHeight: 48, padding: '0 16px', border: '2px solid #2e0f38', borderRadius: 16, background: '#fff', color: '#2e0f38', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #2e0f38' }}>+ Add item</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 4px', fontSize: 13, fontWeight: 700 }}>
        <span style={{ ...chip, background: '#f1eaf5' }}>{items.length} items</span>
        <span style={{ ...chip, background: nLow ? '#f1dff3' : '#f1eaf5', color: nLow ? '#6e2c74' : '#2e0f38' }}>{nLow} low</span>
        <span style={{ ...chip, background: '#dde2ee', color: '#1a2c54' }}>{items.filter(i => i.on_loan).length} on loan</span>
        <span style={{ ...chip, background: '#dce8ee', color: '#1a2c54' }}>{counts[0] ? <>Last counted <Day ts={counts[0].counted_at} /></> : 'Never counted'}</span>
      </div>

      {saved && <div role="status" style={{ margin: '10px 0', padding: '10px 14px', borderRadius: 14, background: '#dce8ee', color: '#1a2c54', fontWeight: 700, fontSize: 14 }}>{saved}</div>}
      <ErrorText>{err}</ErrorText>

      {counting && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: '#1a2c54', color: '#f6f1f8', borderRadius: 16, padding: '12px 16px', margin: '14px 0 6px' }}>
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Taking inventory</div>
            <div style={{ fontSize: 14, color: '#dde2ee' }} aria-live="polite">Count what&apos;s actually there and type it in. {changed ? `${changed} differ from the record so far.` : 'Everything matches so far.'}</div>
          </div>
          <button disabled={busy} onClick={() => start(async () => {
            setErr('');
            const r = await saveCount(sp.id, items.map(i => ({ id: i.id, counted: num(drafts[i.id], i.qty) })));
            if (r.error) return setErr(r.error);
            setCounting(false); setDrafts({});
            flash('Inventory saved' + (r.result?.corrected ? ` · ${r.result.corrected} corrected` : ' · everything matched'));
          })} style={{ minHeight: 46, padding: '0 18px', border: 'none', borderRadius: 14, background: '#fff', color: '#1a2c54', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save count'}</button>
          <button onClick={() => { setCounting(false); setDrafts({}); }} style={{ minHeight: 46, padding: '0 8px', border: 'none', background: 'none', color: '#f6f1f8', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {form && (
        <form onSubmit={submit} style={{ border: '2px solid #2e0f38', borderRadius: 18, padding: 16, margin: '14px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1', fontFamily: 'var(--font-serif)', fontSize: 20 }}>{form.id ? 'Edit ' + form.name : 'Add an item'}</div>
          <label style={{ ...label, gridColumn: '1 / -1' }}>Name
            <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={120} placeholder="e.g. Microscopes" style={input} />
          </label>
          <div role="radiogroup" aria-label="Category" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 }}>Category
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATS.map(c => <button key={c} type="button" role="radio" aria-checked={form.category === c} onClick={() => setForm({ ...form, category: c })} style={{ ...pill(form.category === c), minHeight: 42, padding: '0 14px' }}>{c}</button>)}
            </div>
          </div>
          <label style={label}>Quantity<input type="number" min={0} value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} style={{ ...input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={label}>Unit<input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} maxLength={40} placeholder="e.g. boxes" style={input} /></label>
          <label style={label}>Low alert at <span style={{ fontWeight: 400, fontSize: 12, color: '#5c4766', marginTop: -4 }}>optional · 0 = no alert</span>
            <input type="number" min={0} value={form.low_threshold} onChange={e => setForm({ ...form, low_threshold: e.target.value })} style={{ ...input, fontFamily: 'var(--font-mono)' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, minHeight: 46, cursor: 'pointer', gridColumn: '1 / -1' }}>
            <input type="checkbox" checked={form.on_loan} onChange={e => setForm({ ...form, on_loan: e.target.checked })} style={{ width: 22, height: 22, accentColor: '#8351a8' }} />On loan from the main closet
          </label>
          <label style={{ ...label, gridColumn: '1 / -1' }}>Note <span style={{ fontWeight: 400, fontSize: 12, color: '#5c4766', marginTop: -4 }}>optional</span>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} maxLength={200} placeholder="e.g. 2 need new bulbs" style={input} />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" disabled={busy} style={{ minHeight: 48, padding: '0 20px', border: 'none', borderRadius: 14, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680' }}>Save item</button>
            {form.id && (
              <button type="button" disabled={busy} onClick={() => { if (confirm(`Remove ${form.name} from ${sp.name}?`)) run(() => removeSpaceItem(form.id!), () => setForm(null)); }}
                style={{ minHeight: 48, padding: '0 14px', border: '2px solid #8c1c45', borderRadius: 14, background: '#fff', color: '#8c1c45', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Remove</button>
            )}
            <button type="button" onClick={() => setForm(null)} style={{ minHeight: 48, padding: '0 8px', border: 'none', background: 'none', color: '#5c4766', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      <div role="group" aria-label="Show" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0 4px' }}>
        {['All', ...CATS, 'On loan', 'Low'].map(c => <button key={c} aria-pressed={filter === c} onClick={() => setFilter(c)} style={pill(filter === c)}>{c === 'All' ? 'All · ' + items.length : c}</button>)}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {shown.map(i => {
          const lv = spaceLevel(i);
          const d = drafts[i.id] ?? String(i.qty);
          const diff = num(d, i.qty) - i.qty;
          return (
            <li key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #efe7f3', flexWrap: 'wrap' }}>
              <Icon name={i.icon} label={i.name} size={44} />
              <div style={{ flex: '1 1 170px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{i.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, color: '#5c4766', marginTop: 3 }}>
                  <span>{i.category}</span>
                  {i.on_loan && <span style={{ fontWeight: 700, color: '#1a2c54', background: '#dde2ee', padding: '2px 8px', borderRadius: 8 }}>On loan from main closet</span>}
                  {lv !== 'ok' && <span style={{ fontWeight: 700, color: lv === 'out' ? '#fff' : '#6e2c74', background: lv === 'out' ? '#8c1c45' : '#f1dff3', padding: '2px 8px', borderRadius: 8 }}>{lv === 'out' ? 'Out' : 'Low'} · alert at {i.low_threshold}</span>}
                  {i.note && <span>· {i.note}</span>}
                </div>
              </div>
              {counting ? (
                <>
                  <span style={{ fontSize: 13, color: '#5c4766' }}>on record <b style={{ fontFamily: 'var(--font-mono)', color: '#2e0f38' }}>{i.qty}</b></span>
                  <input type="number" min={0} value={d} onChange={e => setDrafts({ ...drafts, [i.id]: e.target.value })} aria-label={`Counted ${i.name}`}
                    style={{ width: 96, height: 46, border: '2px solid #8351a8', borderRadius: 12, padding: '0 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: '#2e0f38' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, minWidth: 40, color: diff === 0 ? '#2f4f60' : '#8c1c45' }}>{diff === 0 ? '✓' : (diff > 0 ? '+' : '') + diff}</span>
                </>
              ) : (
                <>
                  <div role="group" aria-label={`${i.name} count`} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1eaf5', borderRadius: 14, padding: 3 }}>
                    <button disabled={busy || i.qty === 0} onClick={() => run(() => adjustSpaceItem(i.id, -1))} aria-label={`One less ${i.name}`} style={step}>−</button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, minWidth: 44, textAlign: 'center' }}>{i.qty}</span>
                    <button disabled={busy} onClick={() => run(() => adjustSpaceItem(i.id, 1))} aria-label={`One more ${i.name}`} style={step}>+</button>
                  </div>
                  <span style={{ fontSize: 13, color: '#5c4766', minWidth: 54 }}>{i.unit}</span>
                  <button onClick={() => edit(i)} aria-label={`Edit ${i.name}`} style={{ minHeight: 44, padding: '0 14px', border: '2px solid #2e0f38', borderRadius: 12, background: '#fff', color: '#2e0f38', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Edit</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 20px', gap: 8 }}>
          <sl-block deco="1" aria-hidden="true" color="lavender" tilt="-10" float="2" radius="16" style={{ position: 'absolute', left: '12%', top: 16, width: 44, height: 44 }} />
          <sl-block deco="1" aria-hidden="true" mhide="1" color="teal" tilt="8" float="4" radius="12" style={{ position: 'absolute', right: '14%', top: 40, width: 30, height: 30 }} />
          <Icon name="shelf" size={110} variant="detail" />
          <div style={{ fontFamily: 'var(--font-hand)', fontSize: 30, fontWeight: 700, color: '#5e3680' }}>{items.length ? 'nothing in this filter' : 'nothing here yet'}</div>
          <div style={{ fontSize: 15, color: '#3d2547', maxWidth: 360 }}>{items.length ? 'Try another category.' : `Add the supplies, equipment, books and furniture that live in ${sp.name}.`}</div>
        </div>
      )}

      <div style={{ marginTop: 22, borderTop: '2px dashed #e6dbef', paddingTop: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, margin: '0 0 4px' }}>Inventory counts</h3>
        {history.map(({ c, lines, first }) => (
          <div key={c.id} style={{ borderTop: '1px solid #efe7f3' }}>
            <button onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}
              style={{ width: '100%', minHeight: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer', color: '#2e0f38', textAlign: 'left' }}>
              <span style={{ fontSize: 15 }}><b><Day ts={c.counted_at} /></b> · {c.counted_by_name || 'Someone'}</span>
              <span style={{ fontSize: 14, color: '#5c4766' }}>{c.lines.length} counted · {first ? 'first count' : `${lines.length} changed since last count`} {open === c.id ? '▾' : '▸'}</span>
            </button>
            {open === c.id && (
              <div style={{ padding: '0 0 10px' }}>
                <div style={{ fontSize: 13, color: '#5c4766', marginBottom: 4 }}>{first ? 'Compared with what was on record' : 'Compared with the count before it'}</div>
                {lines.map(l => (
                  <div key={l.item_id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto 56px', gap: 12, fontSize: 14, padding: '5px 0', borderBottom: '1px dotted #e6dbef' }}>
                    <span>{l.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{l.base} → {l.counted}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right', color: l.dd < 0 ? '#8c1c45' : '#2f4f60' }}>{(l.dd > 0 ? '+' : '') + l.dd}</span>
                  </div>
                ))}
                {lines.length === 0 && <div style={{ fontSize: 14, padding: '4px 0' }}>No changes.</div>}
              </div>
            )}
          </div>
        ))}
        {counts.length === 0 && <div style={{ fontSize: 15, color: '#5c4766', padding: '6px 0' }}>No counts yet. Tap Take inventory to record the first one.</div>}
      </div>
    </section>
  );
}

'use client';
import { useState, useTransition, type CSSProperties, type FormEvent } from 'react';
import { ErrorText } from '@/components/form';
import { LEVEL, fmtDate, isoPlus, level } from '@/lib/format';
import { requestBorrow, requestCustom, requestLaptop, requestSupply } from './actions';

export type CatalogItem = { id: string; name: string; category: string; unit: string; qty: number; low_threshold: number; icon: string | null; lendable: boolean; back_on: string | null };
export type ModalMode = { kind: 'supply'; item: CatalogItem } | { kind: 'custom' } | { kind: 'laptop' };

const field: CSSProperties = { height: 48, border: '2px solid #e6dbef', borderRadius: 14, padding: '0 14px', font: 'inherit', fontWeight: 400, fontSize: 16, background: '#fff', color: '#2e0f38', width: '100%' };
const dateField: CSSProperties = { ...field, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 14 };
const label: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 };
const hint: CSSProperties = { fontWeight: 400, color: '#5c4766', fontSize: 13 };
// How long a teacher can borrow something for, in days from today.
const SPANS: [string, number][] = [['Today', 0], ['Tomorrow', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14]];

const step: CSSProperties = { width: 52, height: 52, border: 'none', borderRadius: 14, background: '#fff', fontSize: 24, fontWeight: 700, cursor: 'pointer', color: '#2e0f38' };

export function RequestModal({ mode, room, laptopsFree, onClose }: { mode: ModalMode; room: string; laptopsFree: number; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<'temp' | 'full'>('temp');
  const [roomVal, setRoomVal] = useState(room);
  const [dates] = useState(() => ({ from: isoPlus(1), to: isoPlus(3) }));
  const [until, setUntil] = useState(() => isoPlus(1));
  const [err, setErr] = useState('');
  const [sent, setSent] = useState('');
  const [pending, start] = useTransition();
  const it = mode.kind === 'supply' ? mode.item : null;
  const borrow = !!it?.lendable;
  const isLaptop = mode.kind === 'laptop';
  const showQty = !isLaptop || type === 'temp';
  const roomRequired = isLaptop && type === 'full';

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    f.set('qty', String(qty));
    const name = String(f.get('name') ?? '').trim();
    const r = String(f.get('room') ?? '').trim();
    if (mode.kind === 'custom' && !name) return setErr('Add the item name.');
    if (roomRequired && !r) return setErr('Classroom is required for full-time class use.');
    if (isLaptop && type === 'temp' && (!f.get('from') || !f.get('to'))) return setErr('Pick the checkout dates.');
    if (borrow && !until) return setErr("Pick when you'll bring it back.");
    setErr('');
    start(async () => {
      let res;
      if (it) { f.set('item', it.id); f.set('until', until); res = await (borrow ? requestBorrow(f) : requestSupply(f)); }
      else if (mode.kind === 'custom') res = await requestCustom(f);
      else { f.set('type', type); res = await requestLaptop(f); }
      if (res.error) return setErr(res.error);
      setSent(it && borrow ? `${qty} ${it.unit} of ${it.name}, back by ${fmtDate(until)}. You'll get a notice when it's approved.`
        : it ? `${qty} ${it.unit} of ${it.name}. You'll get a notice when it's approved.`
        : mode.kind === 'custom' ? `${name} × ${qty}, marked as a custom request.`
          : type === 'full' ? `1 laptop for ${r}, full-time.` : `${qty} laptops, ${fmtDate(String(f.get('from')))} – ${fmtDate(String(f.get('to')))}.`);
    });
  };

  const title = it ? it.name : mode.kind === 'custom' ? 'Request something not listed' : 'Request laptops';
  const sub = it && borrow ? (it.qty > 0 ? `To borrow and bring back · ${it.qty} on the shelf` : `To borrow and bring back · all borrowed${it.back_on ? ', next one back ' + fmtDate(it.back_on) : ''}`)
    : it ? LEVEL[level(it)].label + ' · counted in ' + it.unit
    : mode.kind === 'custom' ? 'The office will order it for you' : `${laptopsFree} ${laptopsFree === 1 ? 'laptop' : 'laptops'} available right now`;
  const seg = (on: boolean): CSSProperties => ({ minHeight: 44, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: on ? '#2e0f38' : 'transparent', color: on ? '#fff' : '#2e0f38' });

  return (
    <dialog
      className="sl-modal"
      aria-label={title}
      ref={el => { if (el && !el.open) el.showModal(); }}
      onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 28, padding: 24, boxShadow: '0 8px 0 #c2abd4,0 30px 60px rgba(46,15,56,.3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sent ? (
          <>
            <div style={{ position: 'relative', textAlign: 'center', padding: '26px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <sl-block deco="1" aria-hidden="true" settle="0.2" color="lavender" tilt="-10" float="2" radius="12" style={{ position: 'absolute', left: 4, top: 8, width: 34, height: 34 }} />
              <sl-block deco="1" aria-hidden="true" settle="0.35" color="pink" tilt="8" float="4" radius="10" style={{ position: 'absolute', right: 8, top: 20, width: 26, height: 26 }} />
              <sl-block deco="1" aria-hidden="true" settle="0.5" mhide="1" color="navy" tilt="-6" float="1" radius="8" style={{ position: 'absolute', right: 46, top: 84, width: 20, height: 20 }} />
              <sl-block deco="1" aria-hidden="true" settle="0" color="teal" tilt="-6" float="0" radius="32" style={{ width: 110, height: 110, display: 'grid', placeItems: 'center', fontSize: 62, fontWeight: 700, lineHeight: 1 }}>✓</sl-block>
              <div role="status" style={{ border: '4px double #8351a8', borderRadius: 10, padding: '8px 14px', color: '#5e3680', fontWeight: 700, fontSize: 16, letterSpacing: '.06em', textTransform: 'uppercase', transform: 'rotate(-3deg)' }}>Request sent — awaiting approval</div>
              <div style={{ fontSize: 15, color: '#3d2547' }}>{sent}</div>
            </div>
            <button type="button" autoFocus onClick={onClose} style={{ height: 54, border: 'none', borderRadius: 16, background: '#2e0f38', color: '#fff', fontWeight: 700, fontSize: 17, cursor: 'pointer' }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.1, margin: 0 }}>{title}</h2>
                <div style={{ fontSize: 14, color: '#5c4766', marginTop: 4 }}>{sub}</div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ flex: 'none', width: 44, height: 44, borderRadius: 14, border: 'none', background: '#f1eaf5', fontSize: 20, cursor: 'pointer', color: '#2e0f38' }}>×</button>
            </div>

            {isLaptop && (
              <div role="group" aria-label="Kind of laptop request" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: '#f1eaf5', borderRadius: 16, padding: 4 }}>
                <button type="button" aria-pressed={type === 'temp'} onClick={() => { setType('temp'); setErr(''); }} style={seg(type === 'temp')}>Temporary checkout</button>
                <button type="button" aria-pressed={type === 'full'} onClick={() => { setType('full'); setErr(''); }} style={seg(type === 'full')}>Full-time class use</button>
              </div>
            )}

            {mode.kind === 'custom' && (
              <label style={label}>Item name<input name="name" maxLength={120} autoFocus style={field} /></label>
            )}

            {showQty && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1eaf5', borderRadius: 18, padding: 8 }}>
                <button type="button" aria-label="Decrease" onClick={() => setQty(q => Math.max(1, q - 1))} style={step}>−</button>
                <div style={{ textAlign: 'center' }}>
                  <input aria-label="How many" inputMode="numeric" value={qty}
                    onChange={e => { const n = Number.parseInt(e.target.value.replace(/\D/g, ''), 10); setQty(Number.isNaN(n) ? 1 : Math.min(999, Math.max(1, n))); }}
                    style={{ width: 90, border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: '#2e0f38' }} />
                  <div style={{ fontSize: 13, color: '#5c4766' }}>{it ? it.unit : isLaptop ? 'laptops' : 'units'}</div>
                </div>
                <button type="button" aria-label="Increase" onClick={() => setQty(q => Math.min(999, q + 1))} style={step}>+</button>
              </div>
            )}

            {it && qty > it.qty && (
              <div style={{ fontSize: 14, color: '#6e2c74', background: '#f1dff3', padding: '10px 12px', borderRadius: 12 }}>
                {borrow ? `Only ${it.qty} on the shelf right now. You can still ask; the office will let you know.` : `Only ${it.qty} available right now. You can still send it; the office will review.`}
              </div>
            )}

            {borrow && (
              <div role="group" aria-labelledby="until-h" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div id="until-h" style={{ fontSize: 14, fontWeight: 700 }}>How long do you need it?</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SPANS.map(([name, days]) => {
                    const on = until === isoPlus(days);
                    return <button key={name} type="button" aria-pressed={on} onClick={() => { setUntil(isoPlus(days)); setErr(''); }}
                      style={{ ...seg(on), padding: '0 14px', border: `2px solid ${on ? '#2e0f38' : '#e6dbef'}`, background: on ? '#2e0f38' : '#fff' }}>{name}</button>;
                  })}
                </div>
                <label style={label}>Bring it back by
                  <input name="until" type="date" value={until} min={isoPlus(0)} max={isoPlus(183)} onChange={e => setUntil(e.target.value)} style={dateField} />
                </label>
              </div>
            )}

            {mode.kind === 'custom' && (
              <>
                <label style={label}>Product link <span style={{ ...hint, marginTop: -6 }}>optional</span>
                  <input name="url" inputMode="url" maxLength={1000} placeholder="Amazon, Walmart, Target…" style={field} />
                </label>
                <label style={label}>Needed by <span style={{ ...hint, marginTop: -6 }}>optional</span>
                  <input name="needed_by" type="date" min={isoPlus(0)} style={{ ...field, fontFamily: 'var(--font-mono)', fontSize: 15 }} />
                </label>
              </>
            )}

            {isLaptop && type === 'temp' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={label}>From<input name="from" type="date" defaultValue={dates.from} style={dateField} /></label>
                <label style={label}>To<input name="to" type="date" defaultValue={dates.to} style={dateField} /></label>
              </div>
            )}

            <label style={label}>Classroom <span style={{ ...hint, marginTop: -6 }}>{roomRequired ? 'required — the laptop stays in this room' : 'optional'}</span>
              <input name="room" value={roomVal} onChange={e => setRoomVal(e.target.value)} maxLength={60} placeholder="e.g. Rm 108"
                aria-invalid={!!err && roomRequired && !roomVal.trim()}
                style={{ ...field, borderColor: err && roomRequired && !roomVal.trim() ? '#8c1c45' : '#e6dbef' }} />
            </label>
            <label style={label}>Note <span style={{ ...hint, marginTop: -6 }}>optional</span>
              <textarea name="note" rows={2} maxLength={500} style={{ ...field, height: 'auto', padding: '10px 14px', resize: 'vertical' }} />
            </label>
            <ErrorText>{err}</ErrorText>
            <button type="submit" disabled={pending} style={{ height: 58, border: 'none', borderRadius: 18, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 5px 0 #5e3680', opacity: pending ? 0.7 : 1 }}>
              {pending ? 'Sending…' : borrow ? 'Ask to borrow' : 'Send request'}
            </button>
          </>
        )}
      </form>
    </dialog>
  );
}

import { fmtDate, level, suggest } from '@/lib/format';
import type { GItem, GLog, GRequest, GazetteData } from './types';

// The front page picks its own lead story: out of stock, then a request over stock,
// then the lowest item, then the next custom request, else "All quiet".
export type Lead = {
  kind: 'poster' | 'ad' | 'clear'; kicker: string; headline: string; cap: string; body: string; stat: string; note: string; sub: string; urgent: boolean;
  caption?: string; lastSeen?: GLog; item?: GItem; onOrderEta?: string | null;
  // poster
  title?: string; only?: string; details?: string; stampBig?: boolean;
  // ad
  request?: GRequest;
};

export const lastSeen = (it: GItem, log: GLog[]) =>
  log.find(e => e.item_label === it.name && (e.action === 'Deducted' || (e.action === 'Adjustment' && Number(e.qty) < 0)));

export function pickLead(d: GazetteData): Lead {
  const onOrder = (it: GItem) => d.reorders.find(o => o.item_id === it.id);
  const poster = (it: GItem, mode: 'out' | 'low' | 'exceeds', extra = '') => {
    const oo = onOrder(it), arriving = !!oo && mode !== 'exceeds';
    return {
      kind: 'poster' as const, item: it, lastSeen: lastSeen(it, d.log), onOrderEta: arriving ? oo!.eta : null,
      title: arriving ? 'ARRIVING SOON' : mode === 'out' ? 'WANTED' : mode === 'low' ? 'MISSING?' : 'WANTED: ' + it.name,
      only: arriving ? 'Expected ' + fmtDate(oo!.eta) : mode === 'low' ? `Only ${it.qty} left` : mode === 'exceeds' ? extra : '',
      details: `Usual stock: ${it.low_threshold * 2} ${it.unit} · Now: ${it.qty} · Comes in: 1 ${it.pack_name} = ${it.pack_size} ${it.unit}`,
      stampBig: mode !== 'low'
    };
  };

  const out = d.items.find(i => i.qty === 0);
  if (out) {
    const oo = onOrder(out);
    return {
      ...poster(out, 'out'), kicker: 'Out of stock', headline: oo ? `${out.name} arriving ${fmtDate(oo.eta)}` : `${out.name} out of stock`, cap: 'T',
      body: `he supply closet is out of ${out.name.toLowerCase()}. The low-stock line sits at ${out.low_threshold} ${out.unit}, and teachers will start asking by lunch. `
        + (oo ? 'A reorder is already on the way.' : `${suggest(out).text}${out.vendor ? ' from ' + out.vendor : ''}; the saved product link is one stamp away.`),
      stat: `${out.qty} ${out.unit} on hand`, note: oo ? 'help is on the way' : 'reorder today!', sub: `${out.name} out of stock`, urgent: true
    };
  }
  const ex = d.requests.find(r => r.kind === 'supply' && r.status === 'pending' && d.items.some(i => i.id === r.item_id && r.qty > i.qty));
  if (ex) {
    const it = d.items.find(i => i.id === ex.item_id)!;
    return {
      ...poster(it, 'exceeds', `Requested by ${ex.teacher} · ${ex.qty} needed · ${it.qty} on hand`), kicker: 'Exceeds stock', headline: `${it.name}: request tops stock`, cap: 'A',
      body: ` request from ${ex.teacher} is waiting for more ${it.name.toLowerCase()} than the shelf can cover. Approving it anyway takes stock to zero and files a reorder. You can also trim the quantity before stamping it.`,
      stat: `${it.qty} of ${ex.qty} available`, note: 'your call, boss', sub: `Request exceeds stock: ${it.name}`, urgent: true
    };
  }
  const low = [...d.items].filter(i => i.low_threshold > 0).sort((a, b) => a.qty / a.low_threshold - b.qty / b.low_threshold)[0];
  if (low && low.qty < low.low_threshold) {
    const oo = onOrder(low);
    return {
      ...poster(low, 'low'), kicker: 'Running low', headline: oo ? `${low.name} arriving ${fmtDate(oo.eta)}` : `${low.name} running low`, cap: 'O',
      body: `nly ${low.qty} ${low.unit} remain against a threshold of ${low.low_threshold}. `
        + (oo ? 'More is already on order.' : `${suggest(low).text}${low.vendor ? ' from ' + low.vendor : ''} to stay ahead of next week.`),
      stat: `${low.qty} ${low.unit} left`, note: 'not urgent yet', sub: 'All the news from the supply closet', urgent: false
    };
  }
  const c = d.requests.filter(r => r.kind === 'custom' && (r.status === 'pending' || r.status === 'approved'))
    .sort((a, b) => (a.needed_by || '9').localeCompare(b.needed_by || '9'))[0];
  if (c) {
    return {
      kind: 'ad', request: c, kicker: 'Custom request', headline: 'Wanted: ' + c.name, cap: 'A',
      body: ` request from ${c.teacher} for something the closet has never stocked. It is on the to-do list${c.url ? ' with the product link attached' : ''}.`,
      stat: `${c.qty} requested`, note: 'new to the shelf', caption: `As requested by ${c.teacher}.`, sub: 'All the news from the supply closet', urgent: false
    };
  }
  return {
    kind: 'clear', kicker: 'Quiet day', headline: 'All quiet on the supply front', cap: 'E',
    body: 'very item is above its low-stock line and no requests are waiting. A rare quiet morning at the supply desk.',
    stat: 'All stocked', note: 'enjoy it ★', caption: 'The supply shelf, fully stocked.', sub: 'All the news from the supply closet', urgent: false
  };
}

// Short headline for the dashboard's mini edition.
export function miniHeadline(d: GazetteData) {
  const out = d.items.find(i => i.qty === 0);
  if (out) return `EXTRA!! ${out.name} hit zero!`;
  const ex = d.requests.find(r => r.kind === 'supply' && r.status === 'pending' && d.items.some(i => i.id === r.item_id && r.qty > i.qty));
  if (ex) return `EXTRA!! ${ex.item_name}: request tops stock!`;
  const crit = d.items.find(i => level(i) === 'critical');
  if (crit) return `${crit.name} down to ${crit.qty}!`;
  return 'All quiet on the supply front.';
}

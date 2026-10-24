// Stock levels, request statuses and dates, as in the prototype's store.js.

export type Level = 'ok' | 'low' | 'critical' | 'out';

export const level = (it: { qty: number; low_threshold: number }): Level =>
  it.qty === 0 ? 'out' : it.qty <= Math.floor(it.low_threshold / 3) ? 'critical' : it.qty < it.low_threshold ? 'low' : 'ok';

export const LEVEL: Record<Level, { label: string; fg: string; bg: string; bar: string }> = {
  ok: { label: 'In stock', fg: '#2f4f60', bg: '#dce8ee', bar: '#4d7b93' },
  low: { label: 'Low', fg: '#6e2c74', bg: '#f1dff3', bar: '#b45dbb' },
  critical: { label: 'Critical', fg: '#fff', bg: '#8c1c45', bar: '#8c1c45' },
  out: { label: 'Out of stock', fg: '#fff', bg: '#8c1c45', bar: '#8c1c45' }
};

export type RequestRow = {
  id: string; kind: 'supply' | 'custom' | 'laptop'; status: 'pending' | 'approved' | 'denied' | 'ordered' | 'delivered';
  qty: number; room: string; note: string; created_at: string; item_name: string; name: string; url: string;
  needed_by: string | null; eta: string | null; laptop_type: 'temp' | 'full' | null; from_date: string | null; to_date: string | null; laptop_tags: string[];
  placement?: 'pending' | 'done' | 'skipped' | null; returned_at?: string | null; item_id?: string | null;
};

// A borrow is a supply request with a return date (to_date).
export const isBorrow = (r: Pick<RequestRow, 'kind' | 'to_date'>) => r.kind === 'supply' && !!r.to_date;
export const borrowedOut = (r: RequestRow) => isBorrow(r) && r.status === 'approved' && !r.returned_at;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "2026-11-03" → "Tue, Nov 3". Calendar dates have no time zone, so this is safe on the server.
export const fmtDate = (iso: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${DAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${MON[m - 1]} ${d}`;
};

// Today plus n days as "YYYY-MM-DD" on the viewer's own calendar (call in the browser).
export const isoPlus = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const STATUS = {
  pending: { label: 'Pending', fg: '#1a2c54', bg: '#dde2ee' },
  approved: { label: 'Approved', fg: '#fff', bg: '#4d7b93' },
  denied: { label: 'Denied', fg: '#fff', bg: '#5c4766' },
  ordered: { label: 'Ordered', fg: '#fff', bg: '#1a2c54' },
  delivered: { label: 'Delivered', fg: '#fff', bg: '#2f4f60' }
};

export const statusOf = (r: RequestRow) =>
  isBorrow(r) && r.status === 'approved' ? (r.returned_at ? { label: 'Given back', fg: '#2f4f60', bg: '#dce8ee' } : { label: 'Borrowed · back by ' + fmtDate(r.to_date), fg: '#fff', bg: '#4d7b93' })
    : r.kind === 'custom' && r.status === 'approved' ? { label: 'Approved – Pending Order', fg: '#fff', bg: '#8351a8' }
      : r.kind === 'custom' && r.status === 'ordered' ? { ...STATUS.ordered, label: 'Ordered · arrives ' + fmtDate(r.eta) }
        : STATUS[r.status];

export const reqTitle = (r: RequestRow) =>
  r.kind === 'supply' ? r.item_name : r.kind === 'custom' ? r.name
    : r.laptop_type === 'full' ? 'Laptop · full-time class use' : 'Laptops · temporary checkout';

// "box" → "boxes", "pack" → "packs"; names with a dash stay as they are.
export const packPlural = (pack: string, n: number) => (n > 1 && !pack.includes('-') ? pack + (/[xs]$/.test(pack) ? 'es' : 's') : pack);

// Suggested reorder: packs = max(1, ceil((threshold×2 − qty) / pack_size)).
export const suggest = (it: { qty: number; low_threshold: number; pack_size: number; pack_name: string; unit: string }) => {
  const packs = Math.max(1, Math.ceil((it.low_threshold * 2 - it.qty) / it.pack_size));
  return { packs, units: packs * it.pack_size, text: `Order ${packs} ${packPlural(it.pack_name, packs)} = ${packs * it.pack_size} ${it.unit}` };
};

export const money = (n: number) => '$' + n.toFixed(2);

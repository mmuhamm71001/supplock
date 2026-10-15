'use client';
import { useSyncExternalStore } from 'react';
import { fmtDate } from '@/lib/format';

const noop = () => () => {};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const time = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
const today = (d: Date) => new Date().toDateString() === d.toDateString();

const FORMATS = {
  time: (d: Date) => time(d),                                                                       // 9:41 AM
  stamp: (d: Date) => (today(d) ? 'Today' : `${MON[d.getMonth()]} ${d.getDate()}`) + ' · ' + time(d),  // Today · 9:41 AM
  ago: (d: Date) => (today(d) ? (d.getHours() < 12 ? 'this morning' : 'this afternoon') : 'on ' + fmtDate(iso(d))), // this morning
  dateline: () => { const n = new Date(); return `${DAYS[n.getDay()]}, ${MON[n.getMonth()]} ${n.getDate()}, ${n.getFullYear()}`; },
  issue: () => { const n = new Date(); return String(Math.floor((n.getTime() - new Date(n.getFullYear(), 0, 0).getTime()) / 864e5)); }
};

// Times and today's date on the viewer's own clock (blank while the page is being prepared on the server).
export function When({ ts, f }: { ts?: string; f: keyof typeof FORMATS }) {
  return <>{useSyncExternalStore(noop, () => FORMATS[f](ts ? new Date(ts) : new Date()), () => '')}</>;
}

'use client';
import { useSyncExternalStore } from 'react';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const noop = () => () => {};

const fmt = (ts: string) => {
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  const h = d.getHours();
  const time = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  return (today ? 'Today' : `${MON[d.getMonth()]} ${d.getDate()}`) + ' · ' + time;
};

// "Today · 9:41 AM" in the viewer's own time zone.
export function Stamp({ ts }: { ts: string }) {
  const text = useSyncExternalStore(noop, () => fmt(ts), () => '');
  return <>{text}</>;
}

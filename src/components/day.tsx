'use client';
import { useSyncExternalStore } from 'react';
import { fmtDate } from '@/lib/format';

const noop = () => () => {};
const local = (ts: string) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "Tue, Nov 3" for a moment in time, on the viewer's own calendar.
export function Day({ ts }: { ts: string }) {
  return <>{useSyncExternalStore(noop, () => fmtDate(local(ts)), () => '')}</>;
}

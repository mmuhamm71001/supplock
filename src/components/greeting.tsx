'use client';
import { useSyncExternalStore } from 'react';

const noop = () => () => {};
const part = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

// Uses the viewer's own clock, not the server's.
export function Greeting({ name }: { name: string }) {
  const hello = useSyncExternalStore(noop, part, () => 'Hello');
  return <>{hello}, {name}.</>;
}

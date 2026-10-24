'use client';
import { useSyncExternalStore } from 'react';

const noop = () => () => {};

// Hand-drawn icon from public/sl/icons.js. The script draws inside <sl-icon> as soon as it sees one, so the
// element is only added after React has taken over the page; until then a same-size space holds its place.
// With `space`, the picture is picked from a space's name and subject (a flask for "Science lab").
export function Icon({ name, label, size, variant, tint, space, style }: { name?: string | null; label?: string; size: number; variant?: 'detail' | 'simple'; tint?: boolean; space?: 'classroom' | 'subject'; style?: React.CSSProperties }) {
  const ready = useSyncExternalStore(noop, () => true, () => false);
  if (!ready) return <span aria-hidden="true" style={{ display: 'inline-block', flex: 'none', width: Math.max(40, size), height: Math.max(40, size) }} />;
  return <sl-icon name={name || ''} label={label} size={String(size)} variant={variant} tint={tint ? '1' : undefined} space={space} style={style} aria-hidden="true" />;
}

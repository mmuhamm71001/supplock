import Link from 'next/link';
import type { CSSProperties } from 'react';

export function Star({ size = 26, fill = '#8351a8' }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
      <polygon points="15,1 18.5,11.5 29,15 18.5,18.5 15,29 11.5,18.5 1,15 11.5,11.5" fill={fill} />
    </svg>
  );
}

export function Wordmark({ href = '/', color = '#2e0f38', star, size = 23, style }: { href?: string; color?: string; star?: string; size?: number; style?: CSSProperties }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, color, textDecoration: 'none', ...style }}>
      <Star size={size + 3} fill={star} />
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: size }}>Supplock</span>
    </Link>
  );
}

// School logo, or a purple rounded square with the school's first letter.
export function SchoolMark({ name, logoUrl, size, radius }: { name: string; logoUrl?: string | null; size: number; radius: number }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={`${name} logo`} width={size} height={size}
        style={{ flex: 'none', width: size, height: size, objectFit: 'contain', borderRadius: Math.round(radius * 0.75), background: '#fff', display: 'block' }} />
    );
  }
  return (
    <span aria-hidden style={{ flex: 'none', width: size, height: size, borderRadius: radius, background: '#8351a8', color: '#fff', display: 'grid',
      placeItems: 'center', fontFamily: 'var(--font-serif)', fontSize: Math.round(size / 2) }}>
      {(name.trim()[0] || '?').toUpperCase()}
    </span>
  );
}

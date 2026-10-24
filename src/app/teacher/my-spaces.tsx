import Link from 'next/link';
import { SpacePanel } from '@/components/space-panel';
import { Icon } from '@/components/icon';
import type { Space, SpaceData } from '@/lib/space-shared';

type Listed = Pick<Space, 'id' | 'name' | 'kind' | 'subject'> & { low: number };

export function MySpaces({ spaces, current }: { spaces: Listed[]; current: SpaceData | null }) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: 0, letterSpacing: '-0.01em' }}>My spaces</h1>
        <div style={{ fontFamily: 'var(--font-hand)', fontSize: 24, color: '#5e3680', transform: 'rotate(-1.5deg)', transformOrigin: 'left', marginTop: 2 }}>keep counts current, or take a full inventory</div>
      </div>
      {spaces.length > 1 && (
        <nav aria-label="My spaces" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {spaces.map(s => {
            const on = s.id === current?.space.id;
            return (
              <Link key={s.id} href={`/teacher?tab=spaces&space=${s.id}`} aria-current={on ? 'page' : undefined} scroll={false}
                style={{ minHeight: 50, padding: '0 16px 0 6px', gap: 6, borderRadius: 999, border: `2px solid ${on ? '#2e0f38' : '#e6dbef'}`, background: on ? '#2e0f38' : '#fff', color: on ? '#fff' : '#2e0f38', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <Icon space={s.kind} label={`${s.subject} ${s.name}`} size={40} />{s.name}{s.low ? ` · ${s.low} low` : ''}
              </Link>
            );
          })}
        </nav>
      )}
      {current ? <SpacePanel key={current.space.id} data={current} isAdmin={false} />
        : <div style={{ fontFamily: 'var(--font-hand)', fontSize: 28, color: '#5e3680', padding: '30px 0' }}>no spaces yet. Your admin can assign you one.</div>}
    </>
  );
}

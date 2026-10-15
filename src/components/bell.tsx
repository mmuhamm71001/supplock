'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { markNotificationsRead } from '@/app/bell-actions';
import { Stamp } from './stamp';

export type Note = { id: string; kind: 'request' | 'urgent' | 'low' | 'status'; text: string; read: boolean; ts: string };

const DOT = { urgent: '#8c1c45', low: '#b45dbb', request: '#4d7b93', status: '#4d7b93' };

// Bell with unread count. Opening it marks everything read.
export function Bell({ notes, dark }: { notes: Note[]; dark?: boolean }) {
  const router = useRouter();
  // While open, show the list as it was when opened, so new items stay bold after they're marked read.
  const [shown, setShown] = useState<Note[] | null>(null);
  const open = shown !== null;
  const box = useRef<HTMLDivElement>(null);
  const unread = notes.filter(n => !n.read).length;

  const toggle = () => {
    if (open) return setShown(null);
    setShown(notes);
    if (unread) markNotificationsRead().then(() => router.refresh());
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setShown(null);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', away);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', away); };
  }, [open]);

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button onClick={toggle} aria-expanded={open} aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        style={{ position: 'relative', width: 44, height: 44, borderRadius: 14, border: dark ? 'none' : '2px solid #e6dbef', background: dark ? '#2a3e6a' : '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dark ? '#f6f1f8' : '#2e0f38'} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></svg>
        {unread > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, background: '#b45dbb', color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{unread}</span>}
      </button>
      {open && (
        <div role="region" aria-label="Notifications" style={{ position: 'absolute', right: 0, top: 54, width: 400, maxWidth: 'calc(100vw - 40px)', maxHeight: '70vh', overflow: 'auto', background: '#fff', color: '#2e0f38', border: '2px solid #2e0f38', borderRadius: 20, boxShadow: '0 6px 0 #2e0f38,0 20px 40px rgba(46,15,56,.25)', padding: 14, zIndex: 30 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 6 }}>Notifications</div>
          {shown.length === 0 && <div style={{ fontFamily: 'var(--font-hand)', fontSize: 22, color: '#5c4766' }}>nothing new yet</div>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {shown.map(n => (
              <li key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid #efe7f3', fontSize: 14, lineHeight: 1.4 }}>
                <span aria-hidden="true" style={{ flex: 'none', width: 10, height: 10, borderRadius: 3, marginTop: 5, background: DOT[n.kind] }} />
                <div>
                  <div style={{ fontWeight: n.read ? 400 : 700 }}>{n.text}{!n.read && <span className="sr-only"> (new)</span>}</div>
                  <div style={{ fontSize: 12, color: '#5c4766', marginTop: 2 }}><Stamp ts={n.ts} /></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

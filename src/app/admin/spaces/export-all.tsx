'use client';
import { isoPlus } from '@/lib/format';

// Download link named with the viewer's own date, added at click time.
export function ExportAll() {
  return (
    <a href="/admin/spaces/export" download onClick={e => { e.currentTarget.href = `/admin/spaces/export?d=${isoPlus(0)}`; }}
      style={{ whiteSpace: 'nowrap', minHeight: 48, padding: '0 16px', border: '2px solid #4d7b93', borderRadius: 16, background: '#fff', color: '#2f4f60', fontWeight: 700, fontSize: 15, boxShadow: '0 4px 0 #4d7b93', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>Export all spaces
    </a>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminHeader } from '@/components/admin-header';
import { SpacePanel } from '@/components/space-panel';
import { requireRole } from '@/lib/auth';
import { getSpace, listSpaces } from '@/lib/spaces';
import { createClient } from '@/lib/supabase/server';
import { ExportAll } from './export-all';
import { SpaceList } from './space-list';

export const metadata: Metadata = { title: 'Spaces · Supplock' };

async function Page({ searchParams }: { searchParams: PageProps<'/admin/spaces'>['searchParams'] }) {
  const me = await requireRole('admin');
  const want = String((await searchParams).space || '');
  const [spaces, teachers] = await Promise.all([
    listSpaces(),
    (await createClient()).from('profiles').select('id, name').eq('role', 'teacher').order('name')
  ]);
  const sel = spaces.find(s => s.id === want) || spaces.find(s => s.kind === 'subject') || spaces[0];
  const data = sel ? await getSpace(sel.id) : null;
  return (
    <>
      <AdminHeader me={me} current="/admin/spaces" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: 0 }}>Spaces</h1>
          <span style={{ fontFamily: 'var(--font-hand)', fontSize: 24, color: '#5e3680' }}>classrooms, labs, the gym, the art room…</span>
          <div style={{ marginLeft: 'auto' }}><ExportAll /></div>
        </div>
        <div style={{ fontSize: 15, color: '#3d2547', marginBottom: 20, maxWidth: 640 }}>
          Each space has one owner who keeps its inventory. Every teacher gets their own classroom. Create subject spaces and assign them to a teacher.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <SpaceList spaces={spaces} teachers={teachers.data || []} selected={sel?.id || null} />
          <div style={{ flex: '2 1 520px', minWidth: 0 }}>
            {data ? <SpacePanel key={data.space.id} data={data} isAdmin />
              : <div style={{ background: '#fff', border: '2px solid #e6dbef', borderRadius: 24, padding: '40px 20px', textAlign: 'center', fontFamily: 'var(--font-hand)', fontSize: 28, color: '#5e3680' }}>no spaces yet. Create one on the left.</div>}
          </div>
        </div>
      </main>
    </>
  );
}

export default function SpacesPage(props: PageProps<'/admin/spaces'>) {
  return (
    <Suspense fallback={<div style={{ height: 64, background: '#1a2c54' }} />}>
      <Page searchParams={props.searchParams} />
    </Suspense>
  );
}

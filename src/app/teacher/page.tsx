import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { TeacherHeader } from '@/components/teacher-header';
import { requireRole } from '@/lib/auth';
import { reqTitle, type RequestRow } from '@/lib/format';
import { getSpace, listSpaces } from '@/lib/spaces';
import { createClient } from '@/lib/supabase/server';
import { MySpaces } from './my-spaces';
import { MyRequests, type MyNote } from './my-requests';
import { Placements, type Placement } from './placements';
import type { CatalogItem } from './request-modal';
import { Supplies } from './supplies';

export const metadata: Metadata = { title: 'Supplies · Supplock' };

const tab = (on: boolean) => ({
  minHeight: 40, padding: '0 18px', borderRadius: 999, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', textDecoration: 'none',
  background: on ? '#2e0f38' : 'transparent', color: on ? '#fff' : '#2e0f38'
});

async function Home({ searchParams }: { searchParams: PageProps<'/teacher'>['searchParams'] }) {
  const me = await requireRole('teacher');
  const q = await searchParams;
  const tabName = q.tab === 'mine' ? 'mine' : q.tab === 'spaces' ? 'spaces' : 'supplies';
  const supabase = await createClient();
  const [items, requests, free, spaces, notes] = await Promise.all([
    supabase.from('catalog').select('id, name, category, unit, qty, low_threshold, icon').order('name'),
    supabase.from('requests').select('id, kind, status, qty, room, note, created_at, item_name, name, url, needed_by, eta, laptop_type, from_date, to_date, laptop_tags, placement')
      .eq('teacher_id', me.id).order('created_at', { ascending: false }),
    supabase.rpc('laptops_available'),
    listSpaces(),
    supabase.from('notices').select('id, text, handled, created_at').eq('teacher_id', me.id).order('created_at', { ascending: false }).limit(10)
  ]);
  const myRequests = (requests.data || []) as RequestRow[];
  const mySpaces = spaces.filter(s => s.owner_id === me.id);
  const icons = new Map(((items.data || []) as CatalogItem[]).map(i => [i.name, i.icon]));
  const placements: Placement[] = myRequests.filter(r => r.placement === 'pending').map(r => ({
    id: r.id, kind: r.kind, title: reqTitle(r), qty: r.kind === 'laptop' ? r.laptop_tags.length : r.qty, icon: r.kind === 'supply' ? icons.get(r.item_name) ?? null : null
  }));
  const picked = tabName === 'spaces' ? mySpaces.find(s => s.id === q.space) || mySpaces[0] : undefined;
  const space = picked ? await getSpace(picked.id) : null;

  return (
    <>
      <TeacherHeader me={me}>
        <nav aria-label="Teacher" style={{ display: 'flex', gap: 4, background: '#f1eaf5', borderRadius: 999, padding: 4 }}>
          <Link href="/teacher" aria-current={tabName === 'supplies' ? 'page' : undefined} style={tab(tabName === 'supplies')}>Supplies</Link>
          <Link href="/teacher?tab=mine" aria-current={tabName === 'mine' ? 'page' : undefined} style={tab(tabName === 'mine')}>My requests · {myRequests.length}</Link>
          <Link href="/teacher?tab=spaces" aria-current={tabName === 'spaces' ? 'page' : undefined} style={tab(tabName === 'spaces')}>My spaces</Link>
        </nav>
      </TeacherHeader>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px 80px' }}>
        <Placements items={placements} spaces={mySpaces.map(s => ({ id: s.id, name: s.name }))} />
        {tabName === 'mine' ? <MyRequests requests={myRequests} notes={(notes.data || []) as MyNote[]} />
          : tabName === 'spaces' ? <MySpaces spaces={mySpaces} current={space} />
            : <Supplies items={(items.data || []) as CatalogItem[]} room={me.room} laptopsFree={(free.data as number) ?? 0} />}
      </main>
    </>
  );
}

export default function TeacherPage(props: PageProps<'/teacher'>) {
  return (
    <Suspense fallback={<div style={{ height: 70, background: '#fff', borderBottom: '2px solid #e6dbef' }} />}>
      <Home searchParams={props.searchParams} />
    </Suspense>
  );
}

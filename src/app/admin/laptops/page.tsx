import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminHeader } from '@/components/admin-header';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Laptops, type Laptop } from './laptops';

export const metadata: Metadata = { title: 'Laptops · Supplock' };

type Raw = Omit<Laptop, 'holder'> & { holder: { name: string } | null };

async function Page() {
  const me = await requireRole('admin');
  const { data } = await (await createClient()).from('laptops')
    .select('id, tag, status, zoom, room, due_date, holder:profiles(name)').order('tag');
  const laptops = ((data || []) as unknown as Raw[]).map(l => ({ ...l, holder: l.holder?.name || '' }));
  return (
    <>
      <AdminHeader me={me} current="/admin/laptops" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 20px 80px' }}>
        <Laptops laptops={laptops} />
      </main>
    </>
  );
}

export default function LaptopsPage() {
  return (
    <Suspense fallback={<div style={{ height: 64, background: '#1a2c54' }} />}>
      <Page />
    </Suspense>
  );
}

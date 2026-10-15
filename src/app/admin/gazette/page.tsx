import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminHeader } from '@/components/admin-header';
import { requireRole } from '@/lib/auth';
import { getGazette } from './data';
import { gazetteFonts } from './fonts';
import { Gazette } from './gazette';

export const metadata: Metadata = { title: 'The Supplock Gazette' };

async function Page() {
  const me = await requireRole('admin');
  const data = await getGazette();
  return (
    <>
      <AdminHeader me={me} current="/admin/gazette" />
      <main className={gazetteFonts}><Gazette data={data} /></main>
    </>
  );
}

export default function GazettePage() {
  return (
    <Suspense fallback={<div style={{ height: 64, background: '#1a2c54' }} />}>
      <Page />
    </Suspense>
  );
}

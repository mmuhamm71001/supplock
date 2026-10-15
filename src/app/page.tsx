import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe, homeFor } from '@/lib/auth';
import { Landing } from './landing';

// Signed-in people go straight to their dashboard.
async function SignedInRedirect() {
  const me = await getMe();
  if (me) redirect(homeFor(me.role));
  return null;
}

export default function Home() {
  return (
    <>
      <Suspense fallback={null}><SignedInRedirect /></Suspense>
      <Landing />
    </>
  );
}

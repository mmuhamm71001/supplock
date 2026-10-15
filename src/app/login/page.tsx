import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthBackdrop } from '@/components/auth-backdrop';
import { getMe, homeFor } from '@/lib/auth';
import { LAST_CODE_COOKIE, normCode } from '@/lib/school-code';
import { lookupSchool } from './actions';
import { AuthCard, type Mode } from './auth-card';

export const metadata: Metadata = { title: 'Sign in · Supplock' };

async function Card({ searchParams }: { searchParams: PageProps<'/login'>['searchParams'] }) {
  const me = await getMe();
  if (me) redirect(homeFor(me.role));
  const q = await searchParams;
  const mode: Mode = q.mode === 'join' ? 'join' : q.mode === 'create' ? 'create' : 'in';
  const code = normCode(String(q.code || (await cookies()).get(LAST_CODE_COOKIE)?.value || ''));
  const school = code ? await lookupSchool(code) : null;
  return <AuthCard initialMode={mode} initialCode={code} initialSchool={school} />;
}

export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <AuthBackdrop>
      <Suspense fallback={<div style={{ minHeight: 420 }} aria-busy="true" />}>
        <Card searchParams={props.searchParams} />
      </Suspense>
    </AuthBackdrop>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthBackdrop } from '@/components/auth-backdrop';
import { createClient } from '@/lib/supabase/server';
import { ResetForm } from './reset-form';

export const metadata: Metadata = { title: 'New password · Supplock' };

// The reset email links here with a one-time token. Opening the link uses nothing up
// (email scanners open links too); the token is only spent when the form is saved.
async function Form({ searchParams }: { searchParams: PageProps<'/reset-password'>['searchParams'] }) {
  const q = await searchParams;
  const token = typeof q.token_hash === 'string' ? q.token_hash : '';
  if (token) return <ResetForm token={token} />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Supabase's standard link puts the sign-in details after a "#", which only the browser sees.
  return <ResetForm email={user?.email || ''} />;
}

export default function ResetPasswordPage(props: PageProps<'/reset-password'>) {
  return (
    <AuthBackdrop>
      <Suspense fallback={<div style={{ minHeight: 300 }} aria-busy="true" />}>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </AuthBackdrop>
  );
}

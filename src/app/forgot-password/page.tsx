import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthBackdrop } from '@/components/auth-backdrop';
import { ForgotForm } from './forgot-form';

export const metadata: Metadata = { title: 'Reset password · Supplock' };

async function Form({ searchParams }: { searchParams: PageProps<'/forgot-password'>['searchParams'] }) {
  const q = await searchParams;
  return <ForgotForm expired={!!q.expired} />;
}

export default function ForgotPasswordPage(props: PageProps<'/forgot-password'>) {
  return (
    <AuthBackdrop>
      <Suspense fallback={<div style={{ minHeight: 260 }} aria-busy="true" />}>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </AuthBackdrop>
  );
}

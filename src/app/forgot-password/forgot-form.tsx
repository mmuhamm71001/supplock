'use client';
import Link from 'next/link';
import { useState, useTransition, type FormEvent } from 'react';
import { ErrorText, Field, TextInput, h1Style, primaryButton } from '@/components/form';
import { sendPasswordReset } from '../login/actions';

export function ForgotForm({ expired }: { expired: boolean }) {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const r = await sendPasswordReset(f);
      if (r.error) setErr(r.error); else setSent(true);
    });
  };
  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 style={h1Style}>Check your email</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: '#3d2547' }}>If that email has a Supplock account, a link to choose a new password is on its way. Open it on this device. It works once and expires after an hour.</p>
        <Link href="/login" style={{ fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' }}>← Back to sign in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={h1Style}>Forgot your password?</h1>
      <p style={{ margin: '-6px 0 0', fontSize: 15, color: '#3d2547' }}>
        {expired ? 'That reset link has expired or was already used. Ask for a new one below.' : "Enter the email you sign in with and we'll send you a link to choose a new one."}
      </p>
      <Field label="School email"><TextInput name="email" type="email" autoComplete="email" required /></Field>
      <ErrorText>{err}</ErrorText>
      <button type="submit" disabled={pending} style={{ ...primaryButton, opacity: pending ? 0.7 : 1 }}>{pending ? 'Sending…' : 'Send reset link'}</button>
      <Link href="/login" style={{ alignSelf: 'center', fontSize: 14, fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' }}>← Back to sign in</Link>
    </form>
  );
}

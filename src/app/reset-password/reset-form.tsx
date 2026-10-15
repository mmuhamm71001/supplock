'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, useTransition, type FormEvent } from 'react';
import { ErrorText, Field, TextInput, h1Style, primaryButton } from '@/components/form';
import { setNewPassword } from '../login/actions';

const noop = () => () => {};
const readHash = () => window.location.hash;

export function ResetForm({ email, token }: { email?: string; token?: string }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  // "#access_token=…&refresh_token=…" from Supabase's standard reset link (null while rendering on the server).
  const hash = useSyncExternalStore(noop, readHash, () => null);
  const link = hash === null ? null : new URLSearchParams(hash.slice(1));
  const access = link?.get('access_token') || '';
  // A link always wins over whoever is already signed in on this device.
  const missing = !token && !email && link !== null && !access;
  useEffect(() => { if (missing) router.replace('/forgot-password?expired=1'); }, [missing, router]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('password') !== f.get('confirm')) return setErr('The two passwords don’t match.');
    setErr('');
    start(async () => {
      const r = await setNewPassword(f);
      if (r?.error) setErr(r.error);
    });
  };
  if (!token && !access && (!email || link === null)) return <div style={{ minHeight: 300 }} aria-busy="true" />;
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={h1Style}>Choose a new password</h1>
      {email && !access && <p style={{ margin: '-6px 0 0', fontSize: 15, color: '#3d2547' }}>For {email}</p>}
      {token && <input type="hidden" name="token_hash" value={token} />}
      {access && <><input type="hidden" name="access_token" value={access} /><input type="hidden" name="refresh_token" value={link?.get('refresh_token') || ''} /></>}
      <Field label="New password" hint="at least 8 characters"><TextInput name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
      <Field label="Type it again"><TextInput name="confirm" type="password" autoComplete="new-password" minLength={8} required /></Field>
      <ErrorText>{err}</ErrorText>
      <button type="submit" disabled={pending} style={{ ...primaryButton, opacity: pending ? 0.7 : 1 }}>{pending ? 'Saving…' : 'Save new password'}</button>
    </form>
  );
}

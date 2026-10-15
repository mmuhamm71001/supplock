'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { SchoolMark } from '@/components/brand';
import { ErrorText, Field, TextInput, codeInputStyle, h1Style, primaryButton } from '@/components/form';
import { resizeLogo } from '@/components/resize-logo';
import { looksLikeCode, normCode } from '@/lib/school-code';
import type { School } from '@/lib/types';
import { joinSchool, lookupSchool, registerSchool, signIn } from './actions';

export type Mode = 'in' | 'join' | 'create';

const TABS: [Mode, string][] = [['in', 'Sign in'], ['join', 'Join as teacher'], ['create', 'Register school']];

export function AuthCard({ initialMode, initialCode, initialSchool }: { initialMode: Mode; initialCode: string; initialSchool: School | null }) {
  const [mode, setMode] = useState<Mode | 'created'>(initialMode);
  const [code, setCode] = useState(initialCode);
  const [school, setSchool] = useState<School | null>(initialSchool);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState(false);
  const lookupSeq = useRef(0);

  // Live lookup: once the code looks complete, show that school's logo and name.
  useEffect(() => {
    const c = normCode(code);
    if (!looksLikeCode(c)) return;
    if (school && school.code === c) return;
    const seq = ++lookupSeq.current;
    const t = setTimeout(() => {
      lookupSchool(c).then(s => { if (seq === lookupSeq.current) setSchool(s); });
    }, 250);
    return () => clearTimeout(t);
  }, [code, school]);

  useEffect(() => () => { if (logo) URL.revokeObjectURL(logo.url); }, [logo]);

  const onCode = (v: string) => {
    const c = v.toUpperCase();
    setCode(c);
    setErr('');
    if (school && school.code !== normCode(c)) setSchool(null);
  };

  const run = (action: (f: FormData) => Promise<{ error?: string; code?: string }>, extra?: (f: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    extra?.(f);
    setErr('');
    start(async () => {
      const r = await action(f);
      if (r?.error) setErr(r.error);
      else if (r?.code) {
        setNewCode(r.code);
        setSchool(await lookupSchool(r.code));
        setMode('created');
      }
    });
  };

  const pickLogo = async (file?: File) => {
    try {
      const resized = await resizeLogo(file);
      setLogo({ file: resized, url: URL.createObjectURL(resized) });
      setErr('');
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const copy = (c: string) => {
    navigator.clipboard?.writeText(c).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const showSchool = mode === 'created' || (mode !== 'create' && school);
  const kicker = mode === 'join' ? 'Joining' : mode === 'created' ? 'Welcome to Supplock' : 'Signing in to';

  return (
    <>
      {showSchool && school && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '-6px 0 20px', padding: '12px 14px', borderRadius: 18, background: '#f6f1f8' }}>
          <SchoolMark name={school.name} logoUrl={school.logo_url} size={60} radius={18} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#5c4766', fontWeight: 700, letterSpacing: '.04em' }}>{kicker}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.15 }}>{school.name}</div>
          </div>
        </div>
      )}

      {mode !== 'created' && (
        <div role="tablist" aria-label="Account" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, background: '#f1eaf5', borderRadius: 16, padding: 4, marginBottom: 22 }}>
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setErr(''); }}
              style={{ minHeight: 44, padding: '0 6px', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                background: mode === k ? '#2e0f38' : 'transparent', color: mode === k ? '#fff' : '#2e0f38' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === 'in' && (
        <form onSubmit={run(signIn)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={h1Style}>Welcome back</h1>
          <Field label="School code">
            <input name="code" value={code} onChange={e => onCode(e.target.value)} autoComplete="off" required style={codeInputStyle} />
          </Field>
          <Field label="School email"><TextInput name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password"><TextInput name="password" type="password" autoComplete="current-password" required /></Field>
          <ErrorText>{err}</ErrorText>
          <button type="submit" disabled={pending} style={{ ...primaryButton, opacity: pending ? 0.7 : 1 }}>{pending ? 'Signing in…' : 'Sign in'}</button>
          <Link href="/forgot-password" style={{ alignSelf: 'center', fontSize: 14, fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' }}>Forgot your password?</Link>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={run(joinSchool)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={h1Style}>Join your school</h1>
          <Field label="School code" hint="Ask your school admin for it">
            <input name="code" value={code} onChange={e => onCode(e.target.value)} autoComplete="off" required style={codeInputStyle} />
          </Field>
          <Field label="Your name"><TextInput name="name" placeholder="e.g. Ms. Lopez" autoComplete="name" required /></Field>
          <Field label="School email"><TextInput name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Classroom" hint="optional"><TextInput name="room" placeholder="e.g. Rm 214" /></Field>
          <Field label="Choose a password" hint="at least 8 characters"><TextInput name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
          <ErrorText>{err}</ErrorText>
          <button type="submit" disabled={pending} style={{ ...primaryButton, opacity: pending ? 0.7 : 1 }}>{pending ? 'Creating account…' : 'Create teacher account'}</button>
        </form>
      )}

      {mode === 'create' && (
        <form onSubmit={run(registerSchool, f => { if (logo) f.set('logo', logo.file); })} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={h1Style}>Register your school</h1>
          <div style={{ fontSize: 15, color: '#3d2547', marginTop: -6 }}>You&apos;ll be the admin. We&apos;ll give you a school code to share with teachers.</div>
          <Field label="School name"><TextInput name="school" placeholder="e.g. Lincoln Middle School" required /></Field>
          <Field label="Your name"><TextInput name="name" placeholder="e.g. J. Ruiz" autoComplete="name" required /></Field>
          <Field label="Your school email"><TextInput name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Choose a password" hint="at least 8 characters"><TextInput name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 }}>
            <span>School logo <span style={{ display: 'block', fontWeight: 400, fontSize: 13, color: '#5c4766', marginTop: 2 }}>optional · teachers see it when they sign in</span></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.url} alt="New school logo" width={60} height={60} style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 14, border: '2px solid #e6dbef', background: '#fff' }} />
              )}
              <label style={{ position: 'relative', minHeight: 46, padding: '0 16px', borderRadius: 14, border: '2px dashed #8351a8', color: '#5e3680', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {logo ? 'Change logo' : 'Upload logo'}
                <input type="file" accept="image/*" onChange={e => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
              </label>
              {logo && (
                <button type="button" onClick={() => setLogo(null)} style={{ minHeight: 44, border: 'none', background: 'none', color: '#5c4766', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Remove</button>
              )}
            </div>
          </div>
          <ErrorText>{err}</ErrorText>
          <button type="submit" disabled={pending} style={{ ...primaryButton, opacity: pending ? 0.7 : 1 }}>{pending ? 'Creating school…' : 'Create school'}</button>
        </form>
      )}

      {mode === 'created' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
          <h1 style={{ ...h1Style, fontSize: 30 }}>You&apos;re all set</h1>
          <div style={{ fontSize: 15, color: '#3d2547' }}>Share this code with your teachers. They&apos;ll enter it when they join, so their requests land at your school.</div>
          <sl-block color="purple" tilt="-3" float="1" radius="24" style={{ padding: '18px 26px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>School code</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 38, fontWeight: 700, letterSpacing: '.06em' }}>{newCode}</div>
          </sl-block>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
            <button type="button" onClick={() => copy(newCode)} aria-live="polite" style={{ minHeight: 48, padding: '0 18px', border: '2px solid #2e0f38', borderRadius: 14, background: '#fff', color: '#2e0f38', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{copied ? 'Copied ✓' : 'Copy code'}</button>
            <a href="/admin/billing" style={{ minHeight: 48, padding: '0 20px', borderRadius: 14, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', textDecoration: 'none', boxShadow: '0 4px 0 #5e3680' }}>Next: start your free trial →</a>
          </div>
          <div style={{ fontSize: 13, color: '#5c4766' }}>You can find the code and change the logo anytime on your dashboard.</div>
        </div>
      )}
    </>
  );
}

'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SchoolMark } from '@/components/brand';
import { resizeLogo } from '@/components/resize-logo';
import type { School } from '@/lib/types';
import { changeLogo, regenerateCode, removeLogo, renameSchool } from './actions';

const linkBtn = { minHeight: 44, padding: '0 8px', border: 'none', background: 'none', color: '#5c4766', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' } as const;

// School code with Copy, logo upload/change/remove, rename and new code.
export function SchoolStrip({ school }: { school: School }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(school.name);
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<{ error?: string }>) => start(async () => {
    setErr('');
    const r = await fn();
    if (r.error) setErr(r.error); else router.refresh();
  });

  const pick = async (file?: File) => {
    try {
      const f = new FormData();
      f.set('logo', await resizeLogo(file));
      act(() => changeLogo(f));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(school.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const newCode = () => {
    if (!confirm(`Make a new school code? The old code ${school.code} will stop working for new teachers. Teachers who already joined are not affected.`)) return;
    act(regenerateCode);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 18px', alignItems: 'center', background: '#fff', border: '2px solid #e6dbef', borderRadius: 22, padding: '14px 18px', marginBottom: 18, opacity: pending ? 0.7 : 1 }}>
      <SchoolMark name={school.name} logoUrl={school.logo_url} size={56} radius={19} />
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        {renaming ? (
          <form onSubmit={e => { e.preventDefault(); act(async () => { const r = await renameSchool(name); if (!r.error) setRenaming(false); return r; }); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="sr-only" htmlFor="school-name">School name</label>
            <input id="school-name" value={name} onChange={e => setName(e.target.value)} autoFocus
              style={{ height: 44, border: '2px solid #2e0f38', borderRadius: 12, padding: '0 12px', font: 'inherit', fontWeight: 700, fontSize: 16, minWidth: 0, flex: '1 1 180px' }} />
            <button type="submit" style={{ minHeight: 44, padding: '0 14px', border: 'none', borderRadius: 12, background: '#2e0f38', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            <button type="button" onClick={() => { setRenaming(false); setName(school.name); }} style={linkBtn}>Cancel</button>
          </form>
        ) : (
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {school.name}{' '}
            <button type="button" onClick={() => setRenaming(true)} style={{ ...linkBtn, minHeight: 32, fontWeight: 400, fontSize: 13 }}>Rename</button>
          </div>
        )}
        <div style={{ fontSize: 14, color: '#5c4766' }}>Teachers join Supplock with this school code</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, letterSpacing: '.06em', background: '#f1eaf5', padding: '8px 14px', borderRadius: 12 }}>{school.code}</span>
        <button type="button" onClick={copy} aria-live="polite" style={{ minHeight: 44, padding: '0 14px', border: '2px solid #2e0f38', borderRadius: 12, background: '#fff', color: '#2e0f38', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{copied ? 'Copied ✓' : 'Copy'}</button>
        <label style={{ position: 'relative', minHeight: 44, padding: '0 14px', borderRadius: 12, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 3px 0 #5e3680' }}>
          {school.logo_url ? 'Change logo' : 'Upload logo'}
          <input type="file" accept="image/*" disabled={pending} onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        </label>
        {school.logo_url && <button type="button" onClick={() => act(removeLogo)} style={linkBtn}>Remove logo</button>}
        <button type="button" onClick={newCode} style={linkBtn}>New code</button>
      </div>
      {err && <div role="alert" style={{ flexBasis: '100%', color: '#8c1c45', fontSize: 14, fontWeight: 700 }}>{err}</div>}
    </div>
  );
}

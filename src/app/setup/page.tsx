import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { requireRole } from '@/lib/auth';
import { runChecks } from './checks';

export const metadata: Metadata = { title: 'Setup check · Supplock' };

async function Results() {
  await connection();
  // On the live site only admins may see how things are configured. Locally it's open, for first-time setup.
  if (process.env.NODE_ENV === 'production') await requireRole('admin');
  const checks = await runChecks();
  const allOk = checks.every(c => c.ok);
  return (
    <>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checks.map(c => (
          <li key={c.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 16,
            background: c.ok ? '#dce8ee' : '#f1dff3' }}>
            <span aria-hidden style={{ flex: 'none', width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
              fontWeight: 700, color: '#fff', background: c.ok ? '#4d7b93' : '#8c1c45' }}>{c.ok ? '✓' : '!'}</span>
            <div>
              <div style={{ fontWeight: 700 }}>{c.label}<span className="sr-only">{c.ok ? ' — OK' : ' — needs attention'}</span></div>
              {!c.ok && c.help && <div style={{ fontSize: 14, color: '#3d2547', marginTop: 2 }}>{c.help}</div>}
            </div>
          </li>
        ))}
      </ul>
      <p style={{ margin: '20px 0 0', fontWeight: 700, color: allOk ? '#335a6e' : '#8c1c45' }}>
        {allOk ? 'Everything is connected. Supplock is ready for the next step.' : 'Fix the items marked “!” and reload this page.'}
      </p>
    </>
  );
}

export default function SetupPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '90px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', border: '2px solid #e6dbef', borderRadius: 28, padding: 28,
        boxShadow: '0 20px 50px rgba(46,15,56,.12)', alignSelf: 'flex-start' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#2e0f38', textDecoration: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden><polygon points="15,1 18.5,11.5 29,15 18.5,18.5 15,29 11.5,18.5 1,15 11.5,11.5" fill="#8351a8" /></svg>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 23 }}>Supplock</span>
        </Link>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, margin: '18px 0 6px' }}>Setup check</h1>
        <p style={{ margin: '0 0 20px', color: '#5c4766' }}>Checks the connection to your database. No secret keys are shown here.</p>
        <Suspense fallback={<p style={{ fontWeight: 700 }}>Checking…</p>}>
          <Results />
        </Suspense>
      </div>
    </main>
  );
}

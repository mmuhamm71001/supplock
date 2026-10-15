import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Star } from '@/components/brand';
import { getMe, homeFor } from '@/lib/auth';

// Signed-in people go straight to their dashboard.
async function SignedInRedirect() {
  const me = await getMe();
  if (me) redirect(homeFor(me.role));
  return null;
}

const btn = { minHeight: 52, padding: '0 22px', borderRadius: 16, fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none' } as const;

export default function Home() {
  return (
    <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', padding: '120px 20px', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Suspense fallback={null}><SignedInRedirect /></Suspense>
      <sl-block deco="1" aria-hidden="true" color="orchid" tilt="9" float="3" radius="16" style={{ position: 'absolute', right: 'max(18px,calc(50% - 340px))', top: 60, width: 48, height: 48 }} />
      <sl-block deco="1" aria-hidden="true" mhide="1" color="teal" tilt="-8" float="1" radius="22" style={{ position: 'absolute', left: 'calc(50% - 460px)', top: '30%', width: 72, height: 72 }} />
      <sl-block deco="1" aria-hidden="true" color="pink" tilt="-4" float="2" radius="8" style={{ position: 'absolute', left: 'max(14px,calc(50% - 420px))', bottom: 40, padding: '14px 18px', width: 190 }}>
        <div style={{ fontFamily: 'var(--font-hand)', fontSize: 27, fontWeight: 700, lineHeight: 1.05 }}>Supplies, locked in.</div>
      </sl-block>
      <Star size={44} />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 48, margin: '14px 0 8px' }}>Supplock</h1>
      <p style={{ fontSize: 18, color: '#5c4766', margin: '0 0 26px' }}>School supplies and equipment, requested, approved and tracked.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/login" style={{ ...btn, background: '#8351a8', color: '#fff', boxShadow: '0 5px 0 #5e3680' }}>Sign in</Link>
        <Link href="/login?mode=join" style={{ ...btn, border: '2px solid #2e0f38', color: '#2e0f38', background: '#fff' }}>Join as teacher</Link>
        <Link href="/login?mode=create" style={{ ...btn, border: '2px solid #2e0f38', color: '#2e0f38', background: '#fff' }}>Register school</Link>
      </div>
    </main>
  );
}

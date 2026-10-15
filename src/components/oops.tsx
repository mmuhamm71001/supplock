import Link from 'next/link';
import { Wordmark } from './brand';

// The 404 / error screen from the design.
export function Oops({ code, title, msg, note, homeHref = '/', homeLabel = 'Back to Supplock', onRetry }: {
  code: string; title: string; msg: string; note: string; homeHref?: string; homeLabel?: string; onRetry?: () => void;
}) {
  const btn = { minHeight: 52, padding: '0 22px', borderRadius: 16, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', textDecoration: 'none', cursor: 'pointer' } as const;
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', padding: '120px 20px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Wordmark style={{ position: 'absolute', left: 'max(20px,calc(50% - 600px))', top: 28 }} />
      <sl-block deco="1" aria-hidden="true" color="orchid" tilt="9" float="3" radius="16" style={{ position: 'absolute', right: 'max(18px,calc(50% - 340px))', top: 34, width: 48, height: 48 }} />
      <sl-block deco="1" aria-hidden="true" mhide="1" color="teal" tilt="-8" float="1" radius="22" style={{ position: 'absolute', left: 'calc(50% - 520px)', top: '28%', width: 72, height: 72 }} />
      <sl-block deco="1" aria-hidden="true" mhide="1" color="mist" tilt="6" float="4" style={{ position: 'absolute', right: 'calc(50% - 540px)', top: '36%', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700 }}>LT-404</span>
      </sl-block>
      <sl-block deco="1" aria-hidden="true" color="pink" tilt="-4" float="2" radius="8" style={{ position: 'absolute', left: 'max(14px,calc(50% - 420px))', bottom: 34, padding: '14px 18px', width: 190 }}>
        <div style={{ fontFamily: 'var(--font-hand)', fontSize: 26, fontWeight: 700, lineHeight: 1.05 }}>{note}</div>
      </sl-block>
      <sl-block deco="1" aria-hidden="true" color="navy" tilt="7" float="0" radius="18" style={{ position: 'absolute', right: 'max(16px,calc(50% - 380px))', bottom: 44, width: 58, height: 58 }} />

      <sl-block color="purple" tilt="-4" float="1" radius="40" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 520, padding: '40px 36px 34px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 72, fontWeight: 700, lineHeight: 1 }}>{code}</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.05, margin: '14px 0 10px' }}>{title}</h1>
        <p style={{ fontSize: 18, lineHeight: 1.5, margin: '0 0 24px' }}>{msg}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {onRetry
            ? <button type="button" onClick={onRetry} style={{ ...btn, border: 'none', background: '#fff', color: '#2e0f38', boxShadow: '0 5px 0 #5e3680' }}>Try again</button>
            : <Link href={homeHref} style={{ ...btn, background: '#fff', color: '#2e0f38', boxShadow: '0 5px 0 #5e3680' }}>{homeLabel}</Link>}
          <Link href="/login" style={{ ...btn, padding: '0 18px', border: '2px solid #fff', color: '#fff' }}>Sign in again</Link>
        </div>
      </sl-block>
    </div>
  );
}

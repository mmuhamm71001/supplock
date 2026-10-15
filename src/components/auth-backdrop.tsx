import type { ReactNode } from 'react';
import { Wordmark } from './brand';

// Centered card page with the decorative floating blocks from the sign-in design.
export function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', padding: '110px 20px 160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Wordmark style={{ position: 'absolute', left: 'max(20px,calc(50% - 600px))', top: 28 }} />

      <sl-block deco="1" aria-hidden="true" mhide="1" color="purple" tilt="-8" float="0" data-wide="1" style={{ position: 'absolute', left: 'max(-30px,calc(50% - 570px))', top: 150, width: 230, padding: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Tissues</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#6c3f91', borderRadius: 16, padding: 6, marginBottom: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', color: '#2e0f38', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700 }}>−</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>2</span>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', color: '#2e0f38', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700 }}>+</span>
        </div>
        <div style={{ height: 48, borderRadius: 16, background: '#2e0f38', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16 }}>Request</div>
      </sl-block>
      <sl-block deco="1" aria-hidden="true" mhide="1" color="pink" tilt="7" float="2" data-wide="1" style={{ position: 'absolute', right: 'max(-30px,calc(50% - 540px))', top: 130, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: '#8351a8', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700 }}>✓</span>
        <span style={{ fontWeight: 700, fontSize: 18 }}>Approved</span>
      </sl-block>
      <sl-block deco="1" aria-hidden="true" mhide="1" color="teal" tilt="-6" float="4" radius="20" style={{ position: 'absolute', left: 'max(16px,calc(50% - 450px))', top: '62%', width: 60, height: 60 }} />
      <sl-block deco="1" aria-hidden="true" color="orchid" tilt="9" float="3" radius="16" style={{ position: 'absolute', right: 'max(18px,calc(50% - 330px))', top: 30, width: 46, height: 46 }} />
      <sl-block deco="1" aria-hidden="true" color="pink" tilt="4" float="1" radius="8" style={{ position: 'absolute', left: 'max(14px,calc(50% - 430px))', bottom: 30, padding: '14px 18px', width: 180 }}>
        <div style={{ fontFamily: 'var(--font-hand)', fontSize: 27, fontWeight: 700, lineHeight: 1.05 }}>Supplies, locked in.</div>
      </sl-block>
      <sl-block deco="1" aria-hidden="true" color="navy" tilt="-5" float="2" radius="22" style={{ position: 'absolute', right: 'max(14px,calc(50% - 420px))', bottom: 36, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f6f1f8', border: '3px solid #4d7b93', display: 'block' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>LT-001</span>
      </sl-block>

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 460, background: '#fff', border: '2px solid #e6dbef', borderRadius: 28, padding: 28, boxShadow: '0 20px 50px rgba(46,15,56,.12)' }}>
        {children}
      </div>
    </div>
  );
}

'use client';
import { useState, useTransition, type CSSProperties } from 'react';
import { ErrorText } from '@/components/form';
import { PLANS, TRIAL_DAYS, type Interval, type PlanId } from '@/lib/billing';
import { openPortal, startCheckout } from './actions';

const COLORS: Record<PlanId, [string, string]> = { small: ['#4d7b93', '#335a6e'], medium: ['#8351a8', '#5e3680'], large: ['#1a2c54', '#0f1b37'] };

export function PlanPicker({ trial, teachers }: { trial: boolean; teachers: number }) {
  const [interval, setInterval] = useState<Interval>('year');
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const seg = (on: boolean): CSSProperties => ({ minHeight: 44, padding: '0 18px', border: 'none', borderRadius: 999, fontWeight: 700, fontSize: 15, cursor: 'pointer', background: on ? '#2e0f38' : 'transparent', color: on ? '#fff' : '#2e0f38' });
  return (
    <section aria-labelledby="plans-h">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 id="plans-h" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, margin: 0 }}>Choose a plan</h2>
        <div role="radiogroup" aria-label="Billing period" style={{ display: 'flex', gap: 4, background: '#f1eaf5', borderRadius: 999, padding: 4 }}>
          <button role="radio" aria-checked={interval === 'month'} onClick={() => setInterval('month')} style={seg(interval === 'month')}>Monthly</button>
          <button role="radio" aria-checked={interval === 'year'} onClick={() => setInterval('year')} style={seg(interval === 'year')}>Yearly · 2 months free</button>
        </div>
      </div>
      <ErrorText>{err}</ErrorText>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,250px),1fr))', gap: 18 }}>
        {(Object.keys(PLANS) as PlanId[]).map(id => {
          const p = PLANS[id];
          const [bg, edge] = COLORS[id];
          const tooSmall = p.limit !== null && teachers > p.limit;
          return (
            <li key={id} style={{ background: bg, color: '#fff', borderRadius: 26, padding: '22px 22px 20px', boxShadow: `0 6px 0 ${edge}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>{p.name}</div>
              <div style={{ fontSize: 15, opacity: 0.9 }}>{p.blurb}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 700, marginTop: 6 }}>
                ${interval === 'month' ? p.month : p.year}<span style={{ fontSize: 15, fontWeight: 500 }}>/{interval === 'month' ? 'month' : 'year'}</span>
              </div>
              {interval === 'year' && <div style={{ fontSize: 13, opacity: 0.9 }}>That&apos;s ${Math.round(p.year / 12)}/month</div>}
              <div style={{ fontWeight: 700, fontSize: 15, margin: '4px 0 8px' }}>{p.limit ? `Up to ${p.limit} teachers` : 'Unlimited teachers'}</div>
              <button disabled={busy || tooSmall} onClick={() => start(async () => { setErr(''); const r = await startCheckout(id, interval); if (r?.error) setErr(r.error); })}
                style={{ marginTop: 'auto', minHeight: 52, border: 'none', borderRadius: 16, background: '#fff', color: '#2e0f38', fontWeight: 700, fontSize: 16, cursor: tooSmall ? 'not-allowed' : 'pointer', opacity: busy || tooSmall ? 0.6 : 1 }}>
                {tooSmall ? `You have ${teachers} teachers` : trial ? `Start ${TRIAL_DAYS}-day free trial` : `Choose ${p.name}`}
              </button>
            </li>
          );
        })}
      </ul>
      <p style={{ fontSize: 14, color: '#5c4766', marginTop: 14 }}>
        {trial ? `You won’t be charged for ${TRIAL_DAYS} days, and you can cancel any time before then. ` : ''}Payment is handled securely by Stripe. Have a promo code? Enter it on the next page.
      </p>
    </section>
  );
}

export function ManageBilling() {
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  return (
    <>
      <button disabled={busy} onClick={() => start(async () => { setErr(''); const r = await openPortal(); if (r?.error) setErr(r.error); })}
        style={{ minHeight: 48, padding: '0 20px', border: '2px solid #2e0f38', borderRadius: 14, background: '#fff', color: '#2e0f38', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #2e0f38' }}>
        {busy ? 'Opening…' : 'Manage billing'}
      </button>
      <ErrorText>{err}</ErrorText>
    </>
  );
}

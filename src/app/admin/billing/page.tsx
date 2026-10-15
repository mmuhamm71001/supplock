import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminHeader } from '@/components/admin-header';
import { Day } from '@/components/day';
import { requireRole } from '@/lib/auth';
import { ACTIVE, PLANS, type Billing } from '@/lib/billing';
import { createClient } from '@/lib/supabase/server';
import { ManageBilling, PlanPicker } from './plan-picker';

export const metadata: Metadata = { title: 'Billing · Supplock' };

const STATUS: Record<string, [string, string, string]> = {
  free: ['Free plan', '#fff', '#4d7b93'], trialing: ['Free trial', '#fff', '#8351a8'], active: ['Active', '#fff', '#4d7b93'],
  past_due: ['Payment failed: we’re retrying', '#fff', '#8c1c45'], unpaid: ['Unpaid', '#fff', '#8c1c45'], canceled: ['Canceled', '#fff', '#5c4766'],
  incomplete: ['Waiting for payment', '#1a2c54', '#dde2ee'], incomplete_expired: ['Checkout expired', '#fff', '#5c4766'], paused: ['Paused', '#fff', '#5c4766'], none: ['No plan yet', '#1a2c54', '#dde2ee']
};

async function Page({ searchParams }: { searchParams: PageProps<'/admin/billing'>['searchParams'] }) {
  const me = await requireRole('admin');
  const welcome = !!(await searchParams).welcome;
  const supabase = await createClient();
  const [{ data }, teachers] = await Promise.all([
    supabase.from('school_billing').select('status, plan, billing_interval, teacher_limit, stripe_customer_id, trial_end, current_period_end, cancel_at_period_end, trial_used').maybeSingle(),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher')
  ]);
  const b = (data || { status: 'none' }) as Billing;
  const [label, fg, bg] = STATUS[b.status] || STATUS.none;
  const plan = b.plan ? PLANS[b.plan] : null;
  const active = ACTIVE.includes(b.status);
  const n = teachers.count ?? 0;

  return (
    <>
      <AdminHeader me={me} current="/admin/billing" />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '26px 20px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: 0 }}>Billing</h1>
        {welcome && b.status === 'incomplete' && <div role="status" style={{ background: '#dde2ee', borderRadius: 16, padding: '12px 16px', fontWeight: 700 }}>Thanks! We&apos;re confirming your payment with Stripe. Refresh in a moment.</div>}
        {welcome && active && b.status !== 'free' && <div role="status" style={{ background: '#dce8ee', borderRadius: 16, padding: '12px 16px', fontWeight: 700, color: '#1a2c54' }}>You&apos;re all set. Welcome to Supplock!</div>}

        <section style={{ background: '#fff', border: '2px solid #e6dbef', borderRadius: 24, padding: '22px 24px', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 24 }}>{b.status === 'free' ? 'Free forever' : plan ? `${plan.name} plan` : 'No plan yet'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 999, color: fg, background: bg }}>{label}</span>
            </div>
            <div style={{ fontSize: 15, color: '#5c4766', marginTop: 6, lineHeight: 1.5 }}>
              {b.status === 'free' && <>{me.school.name} uses Supplock free of charge. There&apos;s nothing to pay.</>}
              {plan && <>{n} of {plan.limit ?? 'unlimited'} teachers · billed {b.billing_interval === 'year' ? `$${plan.year} yearly` : `$${plan.month} monthly`}</>}
              {b.status === 'trialing' && b.trial_end && <><br />Your free trial ends <Day ts={b.trial_end} />. You&apos;ll be charged then unless you cancel.</>}
              {b.status !== 'trialing' && active && b.current_period_end && b.status !== 'free' && <><br />{b.cancel_at_period_end ? 'Ends' : 'Renews'} <Day ts={b.current_period_end} />.</>}
              {b.cancel_at_period_end && b.status === 'trialing' && <><br />Set to cancel when the trial ends.</>}
              {!active && <>Choose a plan below to keep using Supplock. Your data is safe; until then the school can view but not change anything.</>}
            </div>
          </div>
          {b.stripe_customer_id && b.status !== 'free' && <div><ManageBilling /></div>}
        </section>

        {!active && <PlanPicker trial={!b.trial_used} teachers={n} />}
      </main>
    </>
  );
}

export default function BillingPage(props: PageProps<'/admin/billing'>) {
  return (
    <Suspense fallback={<div style={{ height: 64, background: '#1a2c54' }} />}>
      <Page searchParams={props.searchParams} />
    </Suspense>
  );
}

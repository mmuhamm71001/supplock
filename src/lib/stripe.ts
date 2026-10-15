import 'server-only';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS, type BillingStatus, type Interval, type PlanId } from './billing';

export const stripeReady = () => !!(process.env.STRIPE_SECRET_KEY || '').trim();

let client: Stripe | null = null;
export function stripe() {
  if (!client) client = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), { appInfo: { name: 'Supplock' } });
  return client;
}

// Copies a Stripe subscription onto the school's billing record (the database only accepts this from the server).
export async function syncSubscription(sub: Stripe.Subscription) {
  const db = createAdminClient();
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  let schoolId = sub.metadata?.school_id || '';
  if (!schoolId) {
    const { data } = await db.from('school_billing').select('school_id').eq('stripe_customer_id', customer).maybeSingle();
    schoolId = data?.school_id || '';
  }
  if (!schoolId) { console.warn('[stripe] subscription for unknown customer', customer); return; }

  const item = sub.items.data[0];
  const key = item?.price.lookup_key || '';
  const m = key.match(/^supplock_(small|medium|large)_(month|year)$/);
  const plan = (m?.[1] as PlanId | undefined) ?? null;
  const ended = sub.status === 'canceled' || sub.status === 'incomplete_expired';
  const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);

  const { error } = await db.from('school_billing').update({
    status: sub.status as BillingStatus,
    plan: ended ? null : plan,
    billing_interval: ended ? null : ((m?.[2] as Interval | undefined) ?? null),
    teacher_limit: plan && !ended ? PLANS[plan].limit : null,
    stripe_customer_id: customer,
    stripe_subscription_id: ended ? null : sub.id,
    trial_end: iso(sub.trial_end),
    current_period_end: iso(item?.current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    ...(sub.trial_end ? { trial_used: true } : {}),
    updated_at: new Date().toISOString()
  }).eq('school_id', schoolId).neq('status', 'free');   // free schools (Manara) are never changed by Stripe
  if (error) throw new Error('Could not save billing: ' + error.message);
}

'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { ACTIVE, PLANS, TRIAL_DAYS, lookupKey, type Billing, type Interval, type PlanId } from '@/lib/billing';
import { stripe, stripeReady } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim().replace(/\/$/, '');

async function adminBilling() {
  const me = await getMe();
  if (!me || me.role !== 'admin') throw new Error('Only admins can manage billing.');
  const db = createAdminClient();
  const { data } = await db.from('school_billing').select('*').eq('school_id', me.school_id).single();
  return { me, db, billing: data as Billing };
}

// Sends the admin to Stripe's secure checkout page for a plan (with a 14-day trial the first time).
export async function startCheckout(plan: PlanId, interval: Interval): Promise<{ error?: string }> {
  if (!PLANS[plan] || (interval !== 'month' && interval !== 'year')) return { error: 'Pick a plan.' };
  if (!stripeReady()) return { error: 'Billing isn’t set up yet.' };
  let url = '';
  try {
    const { me, db, billing } = await adminBilling();
    if (billing.status === 'free') return { error: 'Your school is on a free plan already.' };
    if (ACTIVE.includes(billing.status)) return { error: 'You already have a plan. Use "Manage billing" to change it.' };
    const s = stripe();
    const price = (await s.prices.list({ lookup_keys: [lookupKey(plan, interval)], active: true, limit: 1 })).data[0];
    if (!price) return { error: 'That plan isn’t available right now. Please try again later.' };
    let customer = billing.stripe_customer_id;
    if (!customer) {
      customer = (await s.customers.create({ email: me.email, name: me.school.name, metadata: { school_id: me.school_id } })).id;
      await db.from('school_billing').update({ stripe_customer_id: customer }).eq('school_id', me.school_id);
    }
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: me.school_id,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      payment_method_collection: 'always',
      subscription_data: { metadata: { school_id: me.school_id }, ...(billing.trial_used ? {} : { trial_period_days: TRIAL_DAYS }) },
      success_url: `${SITE()}/admin/billing?welcome=1`,
      cancel_url: `${SITE()}/admin/billing`
    });
    url = session.url || '';
  } catch (e) {
    console.error('[stripe] checkout', (e as Error).message);
    return { error: 'Could not open checkout. Please try again.' };
  }
  redirect(url);
}

// Stripe's own page for changing plan, updating the card, seeing invoices or cancelling.
export async function openPortal(): Promise<{ error?: string }> {
  if (!stripeReady()) return { error: 'Billing isn’t set up yet.' };
  let url = '';
  try {
    const { billing } = await adminBilling();
    if (!billing.stripe_customer_id) return { error: 'Choose a plan first.' };
    // Use the settings made by scripts/stripe-setup.mjs (plan switching etc.), if they exist.
    const configs = (await stripe().billingPortal.configurations.list({ active: true, limit: 100 })).data;
    const configuration = configs.find(c => c.metadata?.supplock === '1')?.id;
    url = (await stripe().billingPortal.sessions.create({ customer: billing.stripe_customer_id, return_url: `${SITE()}/admin/billing`, ...(configuration ? { configuration } : {}) })).url;
  } catch (e) {
    console.error('[stripe] portal', (e as Error).message);
    return { error: 'Could not open billing. Please try again.' };
  }
  redirect(url);
}

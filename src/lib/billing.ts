// Plans shown in the app. Prices live in Stripe (looked up by lookup_key); these numbers are for display
// and for the teacher limit. Change both together: here and in Stripe (scripts/stripe-setup.mjs).

export type PlanId = 'small' | 'medium' | 'large';
export type Interval = 'month' | 'year';

export const PLANS: Record<PlanId, { name: string; limit: number | null; month: number; year: number; blurb: string }> = {
  small: { name: 'Small', limit: 15, month: 29, year: 290, blurb: 'For small schools and single programs' },
  medium: { name: 'Medium', limit: 50, month: 69, year: 690, blurb: 'For most elementary and middle schools' },
  large: { name: 'Large', limit: null, month: 129, year: 1290, blurb: 'For big campuses, no teacher limit' }
};

export const TRIAL_DAYS = 14;
export const lookupKey = (plan: PlanId, interval: Interval) => `supplock_${plan}_${interval}`;

export type BillingStatus = 'none' | 'free' | 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused';
export const ACTIVE: BillingStatus[] = ['free', 'trialing', 'active', 'past_due'];

export type Billing = {
  status: BillingStatus; plan: PlanId | null; billing_interval: Interval | null; teacher_limit: number | null;
  stripe_customer_id: string | null; trial_end: string | null; current_period_end: string | null; cancel_at_period_end: boolean; trial_used: boolean;
};

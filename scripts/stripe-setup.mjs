// One-time setup of Supplock's plans in Stripe. Safe to run again: it only creates what's missing.
// Usage: node scripts/stripe-setup.mjs   (reads STRIPE_SECRET_KEY from .env.local)
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
  .filter(l => /^\w+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const key = env.STRIPE_SECRET_KEY;
if (!/^sk_(test|live)_/.test(key || '')) { console.error('Add STRIPE_SECRET_KEY (sk_test_… or sk_live_…) to .env.local first.'); process.exit(1); }
const stripe = new Stripe(key);
const site = (env.NEXT_PUBLIC_SITE_URL || 'https://www.supplock.com').replace(/\/$/, '');

// Keep in step with src/lib/billing.ts
const PLANS = {
  small: { name: 'Supplock Small', desc: 'Up to 15 teachers', month: 2900, year: 29000 },
  medium: { name: 'Supplock Medium', desc: 'Up to 50 teachers', month: 6900, year: 69000 },
  large: { name: 'Supplock Large', desc: 'Unlimited teachers', month: 12900, year: 129000 }
};

console.log(`Stripe ${key.startsWith('sk_test_') ? 'TEST' : 'LIVE'} mode`);
const portalPrices = [];
for (const [id, p] of Object.entries(PLANS)) {
  const found = (await stripe.products.search({ query: `metadata['supplock_plan']:'${id}'` })).data[0];
  const product = found || await stripe.products.create({ name: p.name, description: p.desc, metadata: { supplock_plan: id } });
  console.log(`${found ? 'found  ' : 'created'} product ${p.name}`);
  const ids = [];
  for (const interval of ['month', 'year']) {
    const lookup = `supplock_${id}_${interval}`;
    const existing = (await stripe.prices.list({ lookup_keys: [lookup], limit: 1 })).data[0];
    const price = existing || await stripe.prices.create({
      product: product.id, currency: 'usd', unit_amount: p[interval], recurring: { interval }, lookup_key: lookup, metadata: { supplock_plan: id }
    });
    console.log(`  ${existing ? 'found  ' : 'created'} ${lookup}: $${price.unit_amount / 100}/${interval}`);
    ids.push(price.id);
  }
  portalPrices.push({ product: product.id, prices: ids });
}

// "Manage billing" page: update card, see invoices, switch plans, cancel at the end of the period.
const configs = (await stripe.billingPortal.configurations.list({ active: true, limit: 100 })).data;
const mine = configs.find(c => c.metadata?.supplock === '1');
const features = {
  customer_update: { enabled: true, allowed_updates: ['email', 'name', 'address'] },
  invoice_history: { enabled: true },
  payment_method_update: { enabled: true },
  subscription_cancel: { enabled: true, mode: 'at_period_end' },
  subscription_update: { enabled: true, default_allowed_updates: ['price', 'promotion_code'], products: portalPrices, proration_behavior: 'create_prorations' }
};
const business_profile = { headline: 'Supplock: supplies, locked in.', privacy_policy_url: `${site}/`, terms_of_service_url: `${site}/` };
if (mine) { await stripe.billingPortal.configurations.update(mine.id, { features, business_profile }); console.log('updated billing portal settings'); }
else { await stripe.billingPortal.configurations.create({ features, business_profile, metadata: { supplock: '1' } }); console.log('created billing portal settings'); }
console.log('Done.');

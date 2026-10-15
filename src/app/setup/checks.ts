import 'server-only';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { createAdminClient, serviceKey } from '@/lib/supabase/admin';

export type Check = { label: string; ok: boolean; help: string };

const TABLES = ['schools', 'profiles', 'items', 'laptops', 'requests', 'reorders', 'todos', 'log',
  'notifications', 'spaces', 'space_items', 'space_counts'];

// Never returns key values, only whether each step works.
export async function runChecks(): Promise<Check[]> {
  const out: Check[] = [];
  const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL);
  out.push({ label: 'Supabase Project URL is filled in', ok: urlOk,
    help: SUPABASE_URL ? 'It should look like https://abcdefgh.supabase.co' : 'Add NEXT_PUBLIC_SUPABASE_URL to .env.local' });
  out.push({ label: 'Public (anon) key is filled in', ok: !!SUPABASE_ANON_KEY, help: 'Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local' });
  out.push({ label: 'Service role key is filled in', ok: !!serviceKey(), help: 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local' });
  if (!urlOk || !SUPABASE_ANON_KEY) return out;

  // The anon key can only call school_by_code, which the migration creates.
  const anon = createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: rpcErr } = await anon.rpc('school_by_code', { p_code: 'XXXXX-0000' });
  out.push({ label: 'Connected to Supabase with the public key', ok: !rpcErr || !/Invalid API key|fetch failed/i.test(rpcErr.message),
    help: rpcErr ? 'Supabase said: ' + rpcErr.message : '' });
  out.push({ label: 'Database migration has been run', ok: !rpcErr,
    help: 'Run supabase/migrations/0001_init.sql in the Supabase SQL Editor' });

  // Visitors who are not signed in must not be able to read school data.
  const { data: leak } = await anon.from('schools').select('id').limit(1);
  out.push({ label: 'Signed-out visitors cannot read school data', ok: !leak || leak.length === 0,
    help: 'Row Level Security looks off. Re-run the migration.' });

  if (!serviceKey()) return out;
  const admin = createAdminClient();
  const missing: string[] = [];
  let keyErr = '';
  for (const t of TABLES) {
    const { error } = await admin.from(t).select('*', { count: 'exact', head: true });
    if (error) { missing.push(t); if (/Invalid API key|JWT/i.test(error.message)) keyErr = error.message; }
  }
  out.push({ label: 'Service role key works', ok: !keyErr, help: keyErr ? 'Supabase said: ' + keyErr : '' });
  out.push({ label: `All ${TABLES.length} tables exist (including Spaces)`, ok: missing.length === 0,
    help: missing.length ? 'Missing: ' + missing.join(', ') : '' });

  // Harmless probe: the service key isn't an admin, so an existing function refuses politely.
  const { error: acctErr } = await admin.rpc('regenerate_school_code');
  out.push({ label: 'Accounts migration has been run', ok: !!acctErr && /Only admins/.test(acctErr.message),
    help: 'Run supabase/migrations/0002_accounts.sql in the Supabase SQL Editor' });

  // Read-only probe: counts free laptops for "no school", which is always 0.
  const { error: reqErr } = await admin.rpc('laptops_available');
  out.push({ label: 'Requests migration has been run', ok: !reqErr,
    help: 'Run supabase/migrations/0003_requests.sql in the Supabase SQL Editor' });

  // Harmless probe: the service key isn't anyone, so this marks nothing as read.
  const { error: apprErr } = await admin.rpc('mark_notifications_read');
  out.push({ label: 'Approvals migration has been run', ok: !apprErr,
    help: 'Run supabase/migrations/0004_approvals.sql in the Supabase SQL Editor' });

  // Harmless probe: the service key isn't a signed-in admin, so this is refused before touching anything.
  const { error: invErr } = await admin.rpc('adjust_item', { p_id: '00000000-0000-0000-0000-000000000000', p_delta: 1 });
  out.push({ label: 'Inventory migration has been run', ok: !!invErr && /sign in/i.test(invErr.message),
    help: 'Run supabase/migrations/0005_inventory.sql in the Supabase SQL Editor' });

  // Harmless probe: the service key isn't a signed-in admin, so this is refused before touching anything.
  const { error: lapErr } = await admin.rpc('toggle_zoom', { p_id: '00000000-0000-0000-0000-000000000000' });
  out.push({ label: 'Laptops migration has been run', ok: !!lapErr && /sign in/i.test(lapErr.message),
    help: 'Run supabase/migrations/0006_laptops.sql in the Supabase SQL Editor' });

  // Harmless probe: the service key isn't a signed-in person, so this is refused before touching anything.
  const { error: spErr } = await admin.rpc('adjust_space_item', { p_id: '00000000-0000-0000-0000-000000000000', p_delta: 1 });
  out.push({ label: 'Spaces migration has been run', ok: !!spErr && /no longer exists|sign in/i.test(spErr.message),
    help: 'Run supabase/migrations/0007_spaces.sql in the Supabase SQL Editor' });

  // Read-only probe: the outbox function exists (calling it with a made-up school claims nothing).
  const { error: mailErr } = await admin.rpc('claim_emails', { p_school: '00000000-0000-0000-0000-000000000000', p_limit: 1 });
  out.push({ label: 'Email migration has been run', ok: !mailErr,
    help: 'Run supabase/migrations/0008_email.sql in the Supabase SQL Editor' });
  const key = (process.env.RESEND_API_KEY || '').trim();
  out.push({ label: 'Email sending (Resend) key is filled in', ok: /^re_\w{10,}/.test(key),
    help: key ? 'It should start with re_' : 'Add RESEND_API_KEY to .env.local. Until then, notifications only show in the bell.' });

  const { error: billErr } = await admin.from('school_billing').select('school_id', { head: true, count: 'exact' });
  out.push({ label: 'Billing migration has been run', ok: !billErr, help: 'Run supabase/migrations/0009_billing.sql in the Supabase SQL Editor' });
  const sk = (process.env.STRIPE_SECRET_KEY || '').trim(), wh = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  out.push({ label: `Stripe secret key is filled in${sk.startsWith('sk_test_') ? ' (test mode)' : ''}`, ok: /^sk_(test|live)_\w{10,}/.test(sk),
    help: sk ? 'It should start with sk_test_ or sk_live_' : 'Add STRIPE_SECRET_KEY to .env.local (Stripe → Developers → API keys)' });
  out.push({ label: 'Stripe webhook secret is filled in', ok: /^whsec_\w{10,}/.test(wh), help: 'Add STRIPE_WEBHOOK_SECRET (Stripe → Developers → Webhooks → your endpoint → Signing secret)' });

  const { data: bucket } = await admin.storage.getBucket('logos');
  out.push({ label: 'Storage bucket for school logos exists', ok: !!bucket?.public,
    help: 'The migration creates a public bucket named "logos". Re-run it.' });
  return out;
}

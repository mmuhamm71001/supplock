import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/env';

// Service-role client. Bypasses RLS: server code only, and only after checking who is asking.
export const serviceKey = () => (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const createAdminClient = () =>
  createClient(SUPABASE_URL, serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });

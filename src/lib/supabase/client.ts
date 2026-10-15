'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

// Browser client: reads only (RLS limits it to the signed-in person's school).
export const createClient = () => createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

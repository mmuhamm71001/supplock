import 'server-only';
import type { Note } from '@/components/bell';
import { createClient } from '@/lib/supabase/server';

// Latest notices for the bell. Row Level Security limits these to the person's own, plus the admin inbox for admins.
export async function getNotes(): Promise<Note[]> {
  const { data } = await (await createClient()).from('notifications').select('id, kind, text, read, ts').order('ts', { ascending: false }).limit(15);
  return (data || []) as Note[];
}

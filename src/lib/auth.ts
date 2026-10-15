import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Me, Role } from '@/lib/types';

// The signed-in person with their school, or null.
export async function getMe(): Promise<Me | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, school_id, name, email, role, room, school:schools(id, name, code, logo_url)')
    .eq('id', user.id)
    .maybeSingle();
  if (!data || !data.school) return null;
  return data as unknown as Me;
}

export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : '/teacher');

// Page guard: sends signed-out people to sign in and the wrong role to their own home.
export async function requireRole(role: Role): Promise<Me> {
  const me = await getMe();
  if (!me) redirect('/login');
  if (me.role !== role) redirect(homeFor(me.role));
  return me;
}

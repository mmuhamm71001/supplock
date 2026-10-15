import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { spaceLevel, type Space, type SpaceCount, type SpaceData, type SpaceItem } from './space-shared';

export * from './space-shared';

type RawSpace = Omit<Space, 'owner'> & { owner: { name: string } | null };

// Spaces the signed-in person can see (Row Level Security: their own, or all for admins).
export async function listSpaces(): Promise<(Space & { items: number; low: number; last: string | null })[]> {
  const supabase = await createClient();
  const [spaces, items, counts] = await Promise.all([
    supabase.from('spaces').select('id, name, kind, subject, owner_id, owner:profiles(name)').order('name'),
    supabase.from('space_items').select('space_id, qty, low_threshold'),
    supabase.from('space_counts').select('space_id, counted_at').order('counted_at', { ascending: false })
  ]);
  return ((spaces.data || []) as unknown as RawSpace[]).map(s => {
    const mine = (items.data || []).filter(i => i.space_id === s.id);
    return {
      ...s, owner: s.owner?.name || 'No owner', items: mine.length, low: mine.filter(i => spaceLevel(i) !== 'ok').length,
      last: (counts.data || []).find(c => c.space_id === s.id)?.counted_at ?? null
    };
  });
}

export async function getSpace(id: string): Promise<SpaceData | null> {
  const supabase = await createClient();
  const [space, items, counts] = await Promise.all([
    supabase.from('spaces').select('id, name, kind, subject, owner_id, owner:profiles(name)').eq('id', id).maybeSingle(),
    supabase.from('space_items').select('id, name, category, qty, unit, low_threshold, on_loan, note, icon').eq('space_id', id).order('name'),
    supabase.from('space_counts').select('id, counted_at, counted_by_name, lines').eq('space_id', id).order('counted_at', { ascending: false }).limit(20)
  ]);
  if (!space.data) return null;
  const s = space.data as unknown as RawSpace;
  return { space: { ...s, owner: s.owner?.name || 'No owner' }, items: (items.data || []) as SpaceItem[], counts: (counts.data || []) as SpaceCount[] };
}

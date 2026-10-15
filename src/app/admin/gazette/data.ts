import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { GLaptop, GRequest, GazetteData } from './types';

// Everything the Gazette reports on, for the admin's school.
export async function getGazette(): Promise<GazetteData> {
  const supabase = await createClient();
  const [items, reorders, requests, todos, laptops, log] = await Promise.all([
    supabase.from('items').select('id, name, unit, qty, low_threshold, vendor, url, pack_name, pack_size, price, icon').order('name'),
    supabase.from('reorders').select('id, item_id, packs, eta').eq('status', 'ordered').order('eta'),
    supabase.from('requests')
      .select('id, kind, status, qty, room, note, created_at, item_id, item_name, name, url, needed_by, eta, laptop_type, from_date, to_date, laptop_tags, teacher:profiles(name)')
      .or('status.eq.pending,and(kind.eq.custom,status.neq.denied)').order('created_at', { ascending: false }).limit(60),
    supabase.from('todos').select('id, text, done, auto, item_id, link, due').order('done').order('created_at').limit(80),
    supabase.from('laptops').select('id, tag, status, zoom, room, holder:profiles(name)').order('tag'),
    supabase.from('log').select('id, ts, action, teacher_name, item_label, qty, room, result').order('ts', { ascending: false }).limit(300)
  ]);
  type Named<T> = Omit<T, 'teacher' | 'holder'> & { teacher?: { name: string } | null; holder?: { name: string } | null };
  return {
    items: (items.data || []) as GazetteData['items'],
    reorders: (reorders.data || []) as GazetteData['reorders'],
    requests: ((requests.data || []) as unknown as Named<GRequest>[]).map(r => ({ ...r, teacher: r.teacher?.name || 'Former teacher' }) as GRequest),
    todos: (todos.data || []) as GazetteData['todos'],
    laptops: ((laptops.data || []) as unknown as Named<GLaptop>[]).map(l => ({ ...l, holder: l.holder?.name || '' }) as GLaptop),
    log: (log.data || []) as GazetteData['log']
  };
}

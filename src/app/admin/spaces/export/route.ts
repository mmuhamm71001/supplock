import type { NextRequest } from 'next/server';
import { getMe } from '@/lib/auth';
import { dayParam, download, spaceRows } from '@/lib/space-export';
import { createClient } from '@/lib/supabase/server';
import { listSpaces, spaceLevel, type SpaceItem } from '@/lib/spaces';
import { buildWorkbook, exportName } from '@/lib/xlsx';

// Every space as Excel: "Summary", "All items", then one sheet per space.
export async function GET(request: NextRequest) {
  const me = await getMe();
  if (!me || me.role !== 'admin') return new Response('Only admins can export all spaces.', { status: 403 });
  const spaces = await listSpaces();
  const { data } = await (await createClient()).from('space_items')
    .select('space_id, id, name, category, qty, unit, low_threshold, on_loan, note, icon').order('name');
  const items = (data || []) as (SpaceItem & { space_id: string })[];
  const of = (id: string) => items.filter(i => i.space_id === id);
  const type = (s: { kind: string; subject: string }) => (s.kind === 'classroom' ? 'Classroom' : s.subject || 'Subject');
  const file = await buildWorkbook([
    { name: 'Summary', rows: spaces.map(s => ({
      Space: s.name, Type: type(s), Owner: s.owner, Items: s.items, 'Total units': of(s.id).reduce((a, b) => a + b.qty, 0),
      Low: of(s.id).filter(i => spaceLevel(i) !== 'ok').length, 'On loan': of(s.id).filter(i => i.on_loan).length,
      'Last counted': s.last ? s.last.slice(0, 10) : 'Never'
    })) },
    { name: 'All items', rows: spaces.flatMap(s => spaceRows(of(s.id)).map(r => ({ Space: s.name, Type: type(s), Owner: s.owner, ...r }))) },
    ...spaces.map(s => ({ name: s.name, rows: spaceRows(of(s.id)) }))
  ]);
  return download(file, exportName(me.school.name, 'all-spaces', dayParam(request.nextUrl.searchParams.get('d'))));
}

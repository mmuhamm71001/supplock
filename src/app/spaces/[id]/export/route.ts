import type { NextRequest } from 'next/server';
import { getMe } from '@/lib/auth';
import { countRows, dayParam, download, spaceRows } from '@/lib/space-export';
import { getSpace } from '@/lib/spaces';
import { buildWorkbook, exportName } from '@/lib/xlsx';

// One space as Excel: "Items" and "Count history". Only its owner and admins can see the space.
export async function GET(request: NextRequest, ctx: RouteContext<'/spaces/[id]/export'>) {
  const me = await getMe();
  if (!me) return new Response('Please sign in.', { status: 401 });
  const { id } = await ctx.params;
  const data = /^[0-9a-f-]{36}$/i.test(id) ? await getSpace(id) : null;
  if (!data) return new Response('That space no longer exists.', { status: 404 });
  const file = await buildWorkbook([
    { name: 'Items', rows: spaceRows(data.items) },
    { name: 'Count history', rows: countRows(data.counts) }
  ]);
  return download(file, exportName(me.school.name, data.space.name, dayParam(request.nextUrl.searchParams.get('d'))));
}

import { NextResponse, type NextRequest } from 'next/server';
import { getMe } from '@/lib/auth';
import { LEVEL, level } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { buildWorkbook, exportName } from '@/lib/xlsx';

// Downloads the main closet as Excel: "Inventory" and "Orders" sheets. ?template=1 gives an empty list to fill in.
export async function GET(request: NextRequest) {
  const me = await getMe();
  if (!me || me.role !== 'admin') return new NextResponse('Only admins can export the inventory.', { status: 403 });
  const p = request.nextUrl.searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(p.get('d') || '') ? p.get('d')! : new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  let file: ArrayBuffer, name: string;
  if (p.get('template')) {
    const help: [string, string][] = [
      ['Item', 'Required. The name teachers will see, e.g. Copy paper.'],
      ['Category', 'Optional. Groups items for teachers, e.g. Paper, Art, Writing, Cleaning.'],
      ['Quantity', 'How many you have now, counted in the base unit (e.g. 24 reams). Blank = 0.'],
      ['Unit', 'The base unit stock is counted in, e.g. reams, boxes, markers.'],
      ['Low-stock threshold', 'You get an alert when stock drops below this. 0 = never.'],
      ['Purchase unit', 'What you buy, e.g. box, case, pack. Use "each" if sold one at a time.'],
      ['Units per purchase', 'How many base units come in one purchase, e.g. 1 box = 10 reams → 10.'],
      ['Vendor', 'Where you usually buy it. The shopping list is grouped by this.'],
      ['Price per unit', 'Price of one base unit in dollars, e.g. 4.50.'],
      ['Link', 'Product page, so the shopping list can open it.']
    ];
    file = await buildWorkbook([
      { name: 'Supplies', rows: [], columns: help.map(h => h[0]) },
      { name: 'How to fill this in', rows: help.map(([Column, Meaning]) => ({ Column, Meaning })) }
    ]);
    name = exportName(me.school.name, 'supply-list-template', day);
  } else {
    const [items, orders] = await Promise.all([
      supabase.from('items').select('*').order('name'),
      supabase.from('reorders').select('*, item:items(pack_size, unit)').order('placed_on', { ascending: false })
    ]);
    file = await buildWorkbook([
      { name: 'Inventory', rows: (items.data || []).map(i => ({
        Item: i.name, Category: i.category, Quantity: i.qty, Unit: i.unit, 'Low-stock threshold': i.low_threshold,
        Status: LEVEL[level(i)].label, Pack: `1 ${i.pack_name} = ${i.pack_size} ${i.unit}`, Vendor: i.vendor,
        'Price per unit': Number(i.price), 'Stock value': Math.round(i.qty * Number(i.price) * 100) / 100, Link: i.url
      })) },
      { name: 'Orders', rows: (orders.data || []).map(o => ({
        Item: o.item_name, Packs: o.packs, Units: o.item ? `${o.packs * o.item.pack_size} ${o.item.unit}` : '',
        Placed: o.placed_on, 'Expected arrival': o.eta || '', Status: o.status === 'received' ? 'Received' : 'On order',
        'Received on': o.received_on || '', 'Packs received': o.received_packs ?? ''
      })) }
    ]);
    name = exportName(me.school.name, 'main-inventory', day);
  }
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store'
    }
  });
}

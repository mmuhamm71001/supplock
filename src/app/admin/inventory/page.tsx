import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminHeader } from '@/components/admin-header';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Inventory, type Reorder } from './inventory';
import type { Item } from './item-panel';

export const metadata: Metadata = { title: 'Inventory · Supplock' };

async function Page() {
  const me = await requireRole('admin');
  const supabase = await createClient();
  const [items, reorders, borrows] = await Promise.all([
    supabase.from('items').select('id, name, category, unit, qty, low_threshold, vendor, url, pack_name, pack_size, price, icon, lendable').order('name'),
    supabase.from('reorders').select('id, item_id, item_name, packs, link, placed_on, eta, status, received_packs')
      .order('status').order('placed_on', { ascending: false }).limit(40),
    supabase.from('requests').select('item_id, qty').eq('kind', 'supply').eq('status', 'approved').not('to_date', 'is', null).is('returned_at', null)
  ]);
  // How many of each lend-out item are borrowed right now.
  const lent: Record<string, number> = {};
  for (const b of borrows.data || []) if (b.item_id) lent[b.item_id] = (lent[b.item_id] || 0) + b.qty;
  return (
    <>
      <AdminHeader me={me} current="/admin/inventory" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 20px 80px' }}>
        <Inventory items={(items.data || []) as Item[]} reorders={(reorders.data || []) as Reorder[]} lent={lent} />
      </main>
    </>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div style={{ height: 64, background: '#1a2c54' }} />}>
      <Page />
    </Suspense>
  );
}

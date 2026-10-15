import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AdminHeader } from '@/components/admin-header';
import { Greeting } from '@/components/greeting';
import { Stamp } from '@/components/stamp';
import { requireRole } from '@/lib/auth';
import { LEVEL, level, type RequestRow } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { getGazette } from './gazette/data';
import { gazetteFonts } from './gazette/fonts';
import { MiniGazette } from './gazette/mini';
import { ApprovalQueue, CustomOrders, type QueueRow } from './queue';
import { SchoolStrip } from './school-strip';
import { Icon } from '@/components/icon';

export const metadata: Metadata = { title: 'Dashboard · Supplock' };

const firstName = (n: string) => n.replace(/^(Mr|Ms|Mrs|Mx|Dr)\.?\s+/i, '').split(' ')[0];
const REQ = 'id, kind, status, qty, room, note, created_at, item_name, name, url, needed_by, eta, laptop_type, from_date, to_date, laptop_tags, teacher:profiles(name), item:items(qty)';
type Raw = RequestRow & { teacher: { name: string } | null; item: { qty: number } | null };

async function Dashboard() {
  const me = await requireRole('admin');
  const supabase = await createClient();
  const [reqs, items, todos, laptops, urgent, gazette] = await Promise.all([
    supabase.from('requests').select(REQ).in('status', ['pending', 'approved', 'ordered']).order('created_at'),
    supabase.from('items').select('id, name, unit, qty, low_threshold, icon'),
    supabase.from('todos').select('id', { count: 'exact', head: true }).eq('done', false),
    supabase.from('laptops').select('status, zoom'),
    supabase.from('notifications').select('id, text, ts').eq('to_role', 'admin').eq('kind', 'urgent').eq('read', false).order('ts', { ascending: false }).limit(3),
    getGazette()
  ]);

  const laps = laptops.data || [];
  const free = laps.filter(l => l.status === 'available').length;
  const rows: QueueRow[] = ((reqs.data || []) as unknown as Raw[]).map(r => ({
    ...r, teacher: r.teacher?.name || 'Former teacher',
    avail: r.kind === 'supply' ? (r.item ? r.item.qty : 0) : r.kind === 'laptop' ? free : null
  }));
  const pending = rows.filter(r => r.status === 'pending')
    .sort((a, b) => Number(b.avail !== null && b.qty > b.avail) - Number(a.avail !== null && a.qty > a.avail));
  const customs = rows.filter(r => r.kind === 'custom' && r.status !== 'pending');

  const stock = (items.data || []).map(i => ({ ...i, lv: level(i) }))
    .sort((a, b) => a.qty / Math.max(1, a.low_threshold) - b.qty / Math.max(1, b.low_threshold));
  const low = stock.filter(i => i.lv !== 'ok').length;
  const summary = `${pending.length} to approve · ${low} running low · ${todos.count ?? 0} on the to-do list`;

  return (
    <>
      <AdminHeader me={me} current="/admin" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: 0 }}><Greeting name={firstName(me.name)} /></h1>
          <span style={{ fontFamily: 'var(--font-hand)', fontSize: 26, color: '#8351a8' }}>{summary}</span>
        </div>
        <SchoolStrip school={me.school} />

        {(urgent.data || []).map(u => (
          <div key={u.id} role="alert" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#8c1c45', color: '#fff', borderRadius: 18, padding: '12px 16px', marginBottom: 10, boxShadow: '0 4px 0 #5e1230' }}>
            <span style={{ fontWeight: 700, flex: 1, fontSize: 15 }}>{u.text}</span>
            <span style={{ fontSize: 13, opacity: 0.9 }}><Stamp ts={u.ts} /></span>
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 22, alignItems: 'start' }}>
          <section aria-label="Requests" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <ApprovalQueue rows={pending} />
            <CustomOrders rows={customs} />
          </section>

          <section aria-label="To-do, stock and laptops" className={gazetteFonts} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <MiniGazette data={gazette} />
            <div style={{ background: '#fff', borderRadius: 26, padding: '20px 22px', border: '2px solid #e6dbef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, margin: 0 }}>Stock levels</h2>
                <Link href="/admin/inventory" style={{ fontSize: 14, fontWeight: 700 }}>Manage →</Link>
              </div>
              {stock.length === 0 && <div style={{ fontSize: 15, color: '#5c4766' }}>No supplies yet. You&apos;ll add them on the Inventory page.</div>}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {stock.map(i => (
                  <li key={i.id} style={{ display: 'grid', gridTemplateColumns: '40px minmax(0,1.3fr) minmax(0,1fr) 92px', gap: 10, alignItems: 'center', fontSize: 14 }}>
                    <Icon name={i.icon} label={i.name} size={40} />
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</span>
                    <div role="img" aria-label={LEVEL[i.lv].label} style={{ height: 12, borderRadius: 999, background: '#efe7f3', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, width: Math.min(100, Math.round(i.qty / (Math.max(1, i.low_threshold) * 2.5) * 100)) + '%', background: LEVEL[i.lv].bar }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, textAlign: 'right', color: i.lv === 'ok' ? '#2f4f60' : i.lv === 'low' ? '#8a3f90' : '#8c1c45' }}>{i.qty} {i.unit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/admin/laptops" style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#1a2c54', color: '#f6f1f8', borderRadius: 26, padding: '18px 22px', boxShadow: '0 5px 0 #0f1b37', textDecoration: 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>Laptops</div>
                <div style={{ fontSize: 14, color: '#c9d1e3' }}>
                  {laps.length === 0 ? 'No laptops added yet'
                    : `${laps.filter(l => l.status === 'out').length} checked out · ${laps.filter(l => l.status === 'assigned').length} assigned to classrooms · ${laps.filter(l => l.zoom).length} with Zoom`}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 700 }}>{free}</span>
              <span style={{ fontSize: 13, lineHeight: 1.1 }}>available<br />of {laps.length}</span>
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ height: 64, background: '#1a2c54' }} />}>
      <Dashboard />
    </Suspense>
  );
}

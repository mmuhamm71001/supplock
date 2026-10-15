import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AdminHeader } from '@/components/admin-header';
import { Icon } from '@/components/icon';
import { Stamp } from '@/components/stamp';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ACTIONS } from './actions-list';
import { LogFilters } from './filters';

export const metadata: Metadata = { title: 'Transaction log · Supplock' };

const PAGE = 200;
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

// Start of a calendar day in the viewer's time zone (tz = minutes from getTimezoneOffset).
const dayStart = (d: string, tz: number) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day) + tz * 60000);
};

async function Page({ searchParams }: { searchParams: PageProps<'/admin/log'>['searchParams'] }) {
  const me = await requireRole('admin');
  const sp = await searchParams;
  const q = one(sp.q).replace(/[,()*\\%_]/g, ' ').trim().slice(0, 80);
  const teacher = one(sp.teacher), action = one(sp.action), from = one(sp.from), to = one(sp.to);
  const tz = Math.max(-840, Math.min(840, Number(one(sp.tz)) || 0));
  const limit = Math.min(5000, PAGE * Math.max(1, Number(one(sp.more)) || 1));
  const supabase = await createClient();

  let query = supabase.from('log').select('id, ts, action, teacher_name, item_label, qty, room, result', { count: 'exact' })
    .order('ts', { ascending: false }).limit(limit);
  if (teacher) query = query.eq('teacher_name', teacher);
  if (action && ACTIONS[action]) query = query.eq('action', action);
  if (q) query = query.or(`teacher_name.ilike.*${q}*,item_label.ilike.*${q}*`);
  if (isDay(from)) query = query.gte('ts', dayStart(from, tz).toISOString());
  if (isDay(to)) query = query.lt('ts', new Date(dayStart(to, tz).getTime() + 864e5).toISOString());

  const [rows, total, teachers] = await Promise.all([
    query,
    supabase.from('log').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('name').eq('role', 'teacher').order('name')
  ]);
  const list = rows.data || [];
  const shown = rows.count ?? list.length;
  const more = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' && k !== 'more' ? [[k, v]] : [])));
  more.set('more', String(limit / PAGE + 1));
  const signed = (a: string, qty: string) => ((a === 'Adjustment' || a === 'Space adjustment') && Number(qty) > 0 ? '+' + qty : qty);

  return (
    <>
      <AdminHeader me={me} current="/admin/log" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: 0 }}>Transaction log</h1>
          <span style={{ fontFamily: 'var(--font-hand)', fontSize: 24, color: '#8351a8' }}>who took the last of the markers? it&apos;s in here.</span>
        </div>
        <LogFilters teachers={(teachers.data || []).map(t => t.name)} />
        <div aria-live="polite" style={{ fontSize: 14, color: '#5c4766', marginBottom: 8 }}>{shown} of {total.count ?? 0} events · most recent first</div>
        <div style={{ background: '#fff', borderRadius: 24, border: '2px solid #e6dbef', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 860 }}>
            <thead><tr style={{ textAlign: 'left', color: '#5c4766', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              <th style={{ padding: '14px 16px' }}>Date / time</th><th style={{ padding: '14px 8px' }}>Action</th><th style={{ padding: '14px 8px' }}>Teacher</th>
              <th style={{ padding: '14px 8px' }}>Item</th><th style={{ padding: '14px 8px' }}>Qty</th><th style={{ padding: '14px 8px' }}>Classroom</th><th style={{ padding: '14px 16px' }}>Resulting stock / note</th>
            </tr></thead>
            <tbody>
              {list.map(e => {
                const [fg, bg] = ACTIONS[e.action] || ['#2e0f38', '#e6dbef'];
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid #efe7f3' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, whiteSpace: 'nowrap' }}><Stamp ts={e.ts} /></td>
                    <td style={{ padding: '10px 8px' }}><span style={{ fontSize: 12, fontWeight: 700, padding: '4px 9px', borderRadius: 8, whiteSpace: 'nowrap', color: fg, background: bg }}>{e.action}</span></td>
                    <td style={{ padding: '10px 8px' }}>{e.teacher_name || '—'}</td>
                    <td style={{ padding: '8px 8px', fontWeight: 500 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{e.item_label && <Icon label={e.item_label} size={40} />}<span>{e.item_label || '—'}</span></div></td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{e.qty === '' ? '—' : signed(e.action, e.qty)}</td>
                    <td style={{ padding: '10px 8px' }}>{e.room || '—'}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{e.result}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <div style={{ padding: 30, textAlign: 'center', fontFamily: 'var(--font-hand)', fontSize: 26, color: '#8351a8' }}>{total.count ? 'nothing matches those filters' : 'nothing on the record yet'}</div>}
        </div>
        {shown > list.length && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link href={`/admin/log?${more}`} scroll={false} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 48, padding: '0 20px', border: '2px solid #2e0f38', borderRadius: 14, background: '#fff', color: '#2e0f38', fontWeight: 700, textDecoration: 'none' }}>
              Show more ({shown - list.length} older)
            </Link>
          </div>
        )}
      </main>
    </>
  );
}

export default function LogPage(props: PageProps<'/admin/log'>) {
  return (
    <Suspense fallback={<div style={{ height: 64, background: '#1a2c54' }} />}>
      <Page searchParams={props.searchParams} />
    </Suspense>
  );
}

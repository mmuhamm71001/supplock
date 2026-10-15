import Link from 'next/link';
import { signOut } from '@/app/login/actions';
import { ACTIVE, type BillingStatus } from '@/lib/billing';
import { getNotes } from '@/lib/notes';
import { createClient } from '@/lib/supabase/server';
import type { Me } from '@/lib/types';
import { Bell } from './bell';
import { SchoolMark, Star } from './brand';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/laptops', label: 'Laptops' },
  { href: '/admin/spaces', label: 'Spaces' },
  { href: '/admin/gazette', label: 'To-do · Gazette' },
  { href: '/admin/log', label: 'Log' },
  { href: '/admin/billing', label: 'Billing' }
];

export async function AdminHeader({ me, current }: { me: Me; current: string }) {
  return (
    <>
      <header style={{ background: '#1a2c54', color: '#f6f1f8', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f6f1f8', textDecoration: 'none' }}>
            <Star size={22} fill="#d9b3dd" /><span style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Supplock</span>
          </Link>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px 4px 4px', borderRadius: 999, background: '#2a3e6a', fontWeight: 700, fontSize: 14, maxWidth: 240 }}>
            <SchoolMark name={me.school.name} logoUrl={me.school.logo_url} size={30} radius={10} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.school.name}</span>
          </span>
          <nav aria-label="Admin" style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {NAV.map(n => {
              const on = n.href === current;
              return (
                <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
                  style={{ padding: '10px 14px', borderRadius: 999, background: on ? '#f6f1f8' : 'transparent', color: on ? '#1a2c54' : '#f6f1f8', fontWeight: on ? 700 : 500, fontSize: 15, textDecoration: 'none' }}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell notes={await getNotes()} dark />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{me.name} · Admin</span>
            <form action={signOut}>
              <button type="submit" style={{ minHeight: 44, padding: '0 8px', border: 'none', background: 'none', color: '#dde2ee', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Log out</button>
            </form>
          </div>
        </div>
      </header>
      {current !== '/admin/billing' && <PlanBanner />}
    </>
  );
}

// Shown on every admin page when the school has no active plan.
async function PlanBanner() {
  const { data } = await (await createClient()).from('school_billing').select('status').maybeSingle();
  const status = (data?.status || 'none') as BillingStatus;
  if (ACTIVE.includes(status)) return null;
  const fresh = status === 'none';
  return (
    <div role="alert" style={{ background: fresh ? '#8351a8' : '#8c1c45', color: '#fff' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontWeight: 700 }}>
        <span style={{ flex: 1 }}>{fresh ? 'Start your 14-day free trial to set up your school. Until then, Supplock is view-only.' : 'Your Supplock plan isn\u2019t active, so the school is view-only. Nothing has been deleted.'}</span>
        <Link href="/admin/billing" style={{ background: '#fff', color: '#2e0f38', padding: '10px 16px', borderRadius: 12, textDecoration: 'none' }}>{fresh ? 'Choose a plan' : 'Fix billing'}</Link>
      </div>
    </div>
  );
}

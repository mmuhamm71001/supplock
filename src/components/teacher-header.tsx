import Link from 'next/link';
import { signOut } from '@/app/login/actions';
import { getNotes } from '@/lib/notes';
import { createClient } from '@/lib/supabase/server';
import type { Me } from '@/lib/types';
import { Bell } from './bell';
import { SchoolMark, Star } from './brand';

export async function TeacherHeader({ me, children }: { me: Me; children?: React.ReactNode }) {
  return (
    <>
      <header style={{ background: '#fff', borderBottom: '2px solid #e6dbef', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/teacher" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2e0f38', textDecoration: 'none' }}>
            <Star size={24} /><span style={{ fontFamily: 'var(--font-serif)', fontSize: 21 }}>Supplock</span>
          </Link>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px 4px 4px', borderRadius: 999, background: '#f1eaf5', fontWeight: 700, fontSize: 14, maxWidth: 260 }}>
            <SchoolMark name={me.school.name} logoUrl={me.school.logo_url} size={32} radius={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.school.name}</span>
          </span>
          {children}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell notes={await getNotes()} />
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{me.name}</div>
              <div style={{ fontSize: 13, color: '#5c4766' }}>Teacher{me.room ? ' · ' + me.room : ''}</div>
            </div>
            <form action={signOut}>
              <button type="submit" style={{ minHeight: 44, padding: '0 10px', border: 'none', background: 'none', color: '#5c4766', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Log out</button>
            </form>
          </div>
        </div>
      </header>
      <PausedBanner />
    </>
  );
}

// Shown to teachers when their school's plan isn't active.
async function PausedBanner() {
  const { data: active } = await (await createClient()).rpc('my_school_active');
  if (active !== false) return null;
  return (
    <div role="alert" style={{ background: '#8c1c45', color: '#fff' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px 20px', fontWeight: 700 }}>
        Requests are paused because your school&apos;s Supplock plan isn&apos;t active. You can still see everything; ask your admin to renew it.
      </div>
    </div>
  );
}

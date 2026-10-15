import { Stamp } from '@/components/stamp';
import { fmtDate, reqTitle, statusOf, type RequestRow } from '@/lib/format';
import { Icon } from '@/components/icon';

const STEPS = ['Pending', 'Approved (Pending Order)', 'Ordered', 'Delivered'];
const ORDER = ['pending', 'approved', 'ordered', 'delivered'];

export type MyNote = { id: string; text: string; handled: boolean; created_at: string };

export function MyRequests({ requests, notes }: { requests: RequestRow[]; notes: MyNote[] }) {
  return (
    <>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 38, margin: '0 0 20px' }}>My requests</h1>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requests.map(r => {
          const s = statusOf(r);
          const idx = ORDER.indexOf(r.status);
          const meta = [
            r.room,
            r.kind === 'laptop' && r.laptop_type === 'temp' ? `${fmtDate(r.from_date)} – ${fmtDate(r.to_date)}` : '',
            r.laptop_tags.length ? r.laptop_tags.join(', ') : '',
            r.kind === 'custom' && r.needed_by ? 'needed by ' + fmtDate(r.needed_by) : ''
          ].filter(Boolean);
          return (
            <li key={r.id} style={{ background: '#fff', borderRadius: 22, padding: '16px 18px', border: '2px solid #efe7f3' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>{reqTitle(r)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>×{r.qty}</span>
                    {r.kind === 'custom' && <span style={{ fontSize: 12, fontWeight: 700, color: '#6e2c74', background: '#f1dff3', padding: '3px 8px', borderRadius: 8 }}>Custom</span>}
                  </div>
                  <div style={{ fontSize: 14, color: '#5c4766', marginTop: 3 }}>
                    <Stamp ts={r.created_at} />{meta.map(m => ' · ' + m).join('')}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 999, color: s.fg, background: s.bg }}>{s.label}</span>
              </div>
              {r.kind === 'custom' && (
                <ol aria-label="Progress" style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6, margin: '14px 0 0' }}>
                  {STEPS.map((name, i) => (
                    <li key={name} aria-current={i === idx ? 'step' : undefined}>
                      <div style={{ height: 8, borderRadius: 999, background: r.status === 'denied' ? '#d9cfe0' : i <= idx ? '#8351a8' : '#e6dbef' }} />
                      <div style={{ fontSize: 12, marginTop: 5, fontWeight: i === idx ? 700 : 400, color: '#3d2547' }}>{name}</div>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
      {requests.length === 0 && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px 44px', gap: 8 }}>
          <sl-block deco="1" aria-hidden="true" color="lavender" tilt="-10" float="2" radius="16" style={{ position: 'absolute', left: '10%', top: 22, width: 46, height: 46 }} />
          <sl-block deco="1" aria-hidden="true" color="teal" tilt="8" float="4" radius="12" style={{ position: 'absolute', right: '12%', top: 46, width: 32, height: 32 }} />
          <sl-block deco="1" aria-hidden="true" mhide="1" color="pink" tilt="6" float="1" radius="14" style={{ position: 'absolute', right: '6%', bottom: 14, width: 58, height: 24 }} />
          <Icon name="shelf" size={120} variant="detail" />
          <div style={{ fontFamily: 'var(--font-hand)', fontSize: 30, fontWeight: 700, color: '#5e3680' }}>no requests yet</div>
          <div style={{ fontSize: 16, color: '#3d2547', maxWidth: 380 }}>Everything you ask for shows up here, with its status. Head to Supplies to make your first request.</div>
        </div>
      )}
      {notes.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, margin: '34px 0 14px' }}>My notes to the office</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map(n => (
              <li key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#fff', borderRadius: 22, padding: '14px 18px', border: '2px solid #efe7f3' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>“{n.text}”</div>
                  <div style={{ fontSize: 14, color: '#5c4766', marginTop: 3 }}><Stamp ts={n.created_at} /></div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 999, ...(n.handled ? { color: '#fff', background: '#2f4f60' } : { color: '#1a2c54', background: '#dde2ee' }) }}>{n.handled ? 'Taken care of' : 'Sent'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

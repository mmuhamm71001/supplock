'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type CSSProperties, type FormEvent } from 'react';
import { Day } from '@/components/day';
import { ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import type { Space } from '@/lib/space-shared';
import { createSpace, deleteSpace, setSpaceOwner } from './actions';

export type ListedSpace = Space & { items: number; low: number; last: string | null };
type Teacher = { id: string; name: string };

const pill = (on: boolean): CSSProperties => ({ minHeight: 42, padding: '0 14px', borderRadius: 999, border: `2px solid ${on ? '#2e0f38' : '#e6dbef'}`, background: on ? '#2e0f38' : '#fff', color: on ? '#fff' : '#2e0f38', fontSize: 14, fontWeight: 700, cursor: 'pointer' });
const field: CSSProperties = { height: 46, border: '2px solid #e6dbef', borderRadius: 12, padding: '0 12px', fontWeight: 400, fontSize: 15, font: 'inherit', color: '#2e0f38', background: '#fff' };
const ICON: Record<string, string> = { science: 'pencils', pe: 'ball', art: 'crayons', music: 'earbuds' };

export function SpaceList({ spaces, teachers, selected }: { spaces: ListedSpace[]; teachers: Teacher[]; selected: string | null }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'subject' | 'classroom'>('all');
  const [kind, setKind] = useState<'subject' | 'classroom'>('subject');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [owner, setOwner] = useState(teachers[0]?.id || '');
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const go = (id: string | null) => router.push(id ? `/admin/spaces?space=${id}` : '/admin/spaces', { scroll: false });

  const shown = spaces.filter(s => filter === 'all' || s.kind === filter)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'subject' ? -1 : 1) || a.name.localeCompare(b.name));

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr('Give the space a name.');
    if (!owner) return setErr('A teacher needs to join before you can assign a space.');
    start(async () => {
      setErr('');
      const r = await createSpace(name, kind, kind === 'subject' ? subject : '', owner);
      if (r.error) return setErr(r.error);
      setName(''); setSubject('');
      if (r.data) go(r.data);
    });
  };

  return (
    <section aria-label="Spaces" style={{ flex: '1 1 340px', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div role="group" aria-label="Show" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {([['all', `All · ${spaces.length}`], ['subject', 'Subject spaces'], ['classroom', 'Classrooms']] as const).map(([k, label]) => (
          <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} style={pill(filter === k)}>{label}</button>
        ))}
      </div>
      <ErrorText>{err}</ErrorText>
      {shown.map(s => {
        const on = s.id === selected;
        return (
          <div key={s.id} style={{ background: '#fff', border: `2px solid ${on ? '#8351a8' : '#e6dbef'}`, borderRadius: 20, padding: '12px 14px', boxShadow: on ? '0 5px 0 #c2abd4' : 'none' }}>
            <button onClick={() => go(s.id)} aria-current={on ? 'true' : undefined}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: '#2e0f38' }}>
              <Icon name={s.kind === 'classroom' ? 'furniture' : ICON[s.subject.toLowerCase()] || 'shelf'} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 8, color: s.kind === 'classroom' ? '#1a2c54' : '#fff', background: s.kind === 'classroom' ? '#dde2ee' : '#5e3680' }}>
                    {s.kind === 'classroom' ? 'Classroom' : s.subject || 'Subject'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#5c4766', marginTop: 2 }}>{s.owner} · {s.items} items · {s.last ? <>counted <Day ts={s.last} /></> : 'never counted'}</div>
              </div>
              {s.low > 0 && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: '#f1dff3', color: '#6e2c74', whiteSpace: 'nowrap' }}>{s.low} low</span>}
            </button>
            {on && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid #efe7f3' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>Owner
                  <select value={s.owner_id || ''} disabled={busy} onChange={e => start(async () => { setErr(''); const r = await setSpaceOwner(s.id, e.target.value); if (r.error) setErr(r.error); })}
                    style={{ ...field, height: 42, padding: '0 10px', fontSize: 14 }}>
                    {!s.owner_id && <option value="">No owner</option>}
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <button disabled={busy} onClick={() => {
                  if (!confirm(`Delete ${s.name} and its ${s.items} items? This cannot be undone.`)) return;
                  start(async () => { setErr(''); const r = await deleteSpace(s.id); if (r.error) setErr(r.error); else go(null); });
                }} style={{ marginLeft: 'auto', minHeight: 42, padding: '0 8px', border: 'none', background: 'none', color: '#8c1c45', fontSize: 14, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>Delete space</button>
              </div>
            )}
          </div>
        );
      })}

      <form onSubmit={create} style={{ background: '#fff', border: '2px dashed #8351a8', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>New space</div>
        <div role="radiogroup" aria-label="Kind" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: '#f1eaf5', borderRadius: 14, padding: 4 }}>
          {([['subject', 'Subject space'], ['classroom', 'Classroom']] as const).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              style={{ minHeight: 40, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: kind === k ? '#2e0f38' : 'transparent', color: kind === k ? '#fff' : '#2e0f38' }}>{label}</button>
          ))}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 14, fontWeight: 700 }}>Name
          <input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="e.g. Music Room" style={field} />
        </label>
        {kind === 'subject' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 14, fontWeight: 700 }}>Subject
            <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={60} placeholder="e.g. Music, Science, PE" style={field} />
          </label>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 14, fontWeight: 700 }}>Owner
          <select value={owner} onChange={e => setOwner(e.target.value)} style={{ ...field, padding: '0 10px' }}>
            {teachers.length === 0 && <option value="">No teachers yet</option>}
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy} style={{ minHeight: 48, border: 'none', borderRadius: 14, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680' }}>Create space</button>
      </form>
    </section>
  );
}

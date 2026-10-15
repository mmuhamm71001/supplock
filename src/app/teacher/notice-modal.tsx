'use client';
import { useState, useTransition, type CSSProperties, type FormEvent } from 'react';
import { ErrorText } from '@/components/form';
import { sendNotice } from './actions';

const IDEAS = ['We’re almost out of copy paper', 'No more tissues', 'The printer is out of toner'];
const field: CSSProperties = { border: '2px solid #e6dbef', borderRadius: 14, padding: '10px 14px', font: 'inherit', fontSize: 16, background: '#fff', color: '#2e0f38', width: '100%', resize: 'vertical' };

// A quick note to the office about something shared running low, the kind of thing nobody requests.
export function NoticeModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return setErr('Add a short note first.');
    setErr('');
    start(async () => {
      const res = await sendNotice(text);
      if (res.error) return setErr(res.error);
      setSent(true);
    });
  };

  return (
    <dialog className="sl-modal" aria-label="Tell the office" ref={el => { if (el && !el.open) el.showModal(); }} onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 28, padding: 24, boxShadow: '0 8px 0 #c2abd4,0 30px 60px rgba(46,15,56,.3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sent ? (
          <>
            <div style={{ textAlign: 'center', padding: '26px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <sl-block deco="1" aria-hidden="true" settle="0" color="teal" tilt="-6" float="0" radius="32" style={{ width: 110, height: 110, display: 'grid', placeItems: 'center', fontSize: 62, fontWeight: 700, lineHeight: 1 }}>✓</sl-block>
              <div role="status" style={{ border: '4px double #8351a8', borderRadius: 10, padding: '8px 14px', color: '#5e3680', fontWeight: 700, fontSize: 16, letterSpacing: '.06em', textTransform: 'uppercase', transform: 'rotate(-3deg)' }}>Sent to the office</div>
              <div style={{ fontSize: 15, color: '#3d2547' }}>Thanks for the heads-up. You&apos;ll get a notice when it&apos;s taken care of.</div>
            </div>
            <button type="button" autoFocus onClick={onClose} style={{ height: 54, border: 'none', borderRadius: 16, background: '#2e0f38', color: '#fff', fontWeight: 700, fontSize: 17, cursor: 'pointer' }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.1, margin: 0 }}>Tell the office</h2>
                <div style={{ fontSize: 14, color: '#5c4766', marginTop: 4 }}>Noticed something running low? Copy paper, tissues, toner…</div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ flex: 'none', width: 44, height: 44, borderRadius: 14, border: 'none', background: '#f1eaf5', fontSize: 20, cursor: 'pointer', color: '#2e0f38' }}>×</button>
            </div>
            <div role="group" aria-label="Quick notes" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {IDEAS.map(i => (
                <button key={i} type="button" onClick={() => setText(i)}
                  style={{ minHeight: 40, padding: '0 12px', borderRadius: 999, border: '2px solid #e6dbef', background: '#fff', color: '#2e0f38', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{i}</button>
              ))}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 }}>Your note
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={300} autoFocus placeholder="e.g. The copy room is down to its last ream" style={field} />
            </label>
            <ErrorText>{err}</ErrorText>
            <button type="submit" disabled={pending} style={{ height: 58, border: 'none', borderRadius: 18, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 5px 0 #5e3680', opacity: pending ? 0.7 : 1 }}>
              {pending ? 'Sending…' : 'Send to the office'}
            </button>
          </>
        )}
      </form>
    </dialog>
  );
}

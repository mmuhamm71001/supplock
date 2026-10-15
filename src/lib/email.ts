import 'server-only';
import { after } from 'next/server';
import { createAdminClient, serviceKey } from '@/lib/supabase/admin';

// Email notifications through Resend (https://resend.com). The database keeps an outbox of
// notifications; after each action we send whatever is waiting. Nothing here ever blocks a click.

type Claimed = { id: string; kind: string; text: string; recipients: string[] | null; ts: string; school: string; to_admin: boolean };
type Mail = { from: string; to: string[]; subject: string; html: string; text: string };

const KEY = () => (process.env.RESEND_API_KEY || '').trim();
const FROM = () => (process.env.EMAIL_FROM || '').trim() || 'Supplock <onboarding@resend.dev>';
const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
export const emailReady = () => !!KEY();

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function compose(n: Claimed, to: string): Mail {
  const link = SITE() ? SITE() + (n.to_admin ? '/admin' : '/teacher?tab=mine') : '';
  const urgent = n.kind === 'urgent';
  const subject = (n.text.length > 90 ? n.text.slice(0, 87) + '…' : n.text);
  const html = `<!doctype html><html><body style="margin:0;background:#f6f1f8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2e0f38">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:2px solid #e6dbef;border-radius:22px">
<tr><td style="padding:22px 26px 6px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5e3680">Supplock · ${esc(n.school)}</td></tr>
<tr><td style="padding:6px 26px 4px">${urgent ? '<div style="display:inline-block;background:#8c1c45;color:#fff;font-weight:700;font-size:13px;padding:4px 10px;border-radius:8px;margin-bottom:10px">Needs attention</div>' : ''}
<div style="font-size:19px;line-height:1.45;font-weight:700">${esc(n.text)}</div></td></tr>
${link ? `<tr><td style="padding:16px 26px 8px"><a href="${esc(link)}" style="display:inline-block;background:#8351a8;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:14px">Open Supplock</a></td></tr>` : ''}
<tr><td style="padding:14px 26px 22px;font-size:13px;color:#5c4766">You get this because you use Supplock at ${esc(n.school)}.</td></tr>
</table></td></tr></table></body></html>`;
  return { from: FROM(), to: [to], subject, html, text: `${n.text}\n\n${link ? 'Open Supplock: ' + link + '\n\n' : ''}— Supplock · ${n.school}` };
}

async function resend(path: string, body: unknown) {
  return fetch('https://api.resend.com' + path, {
    method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// Sends everything in the outbox. Without a Resend key, notifications are marked handled and only show in the bell.
export async function flushEmails() {
  if (!serviceKey()) return;
  const db = createAdminClient();
  const { data, error } = await db.rpc('claim_emails', { p_school: null, p_limit: 50 });
  if (error || !data?.length || !emailReady()) return;
  const claimed = data as Claimed[];
  const mails = claimed.flatMap(n => (n.recipients || []).filter(Boolean).map(to => ({ id: n.id, mail: compose(n, to) })));
  if (!mails.length) return;

  // One request for the whole batch. If Resend refuses it (for example, test mode only allows your own
  // address), send one by one so the allowed ones still go out.
  try {
    const r = await resend('/emails/batch', mails.map(m => m.mail));
    if (r.ok) return;
    if (r.status >= 500 || r.status === 429) throw new Error('Resend busy: ' + r.status);
    console.warn('[email] batch refused, sending one by one:', r.status, (await r.text()).slice(0, 200));
    for (const m of mails) {
      const one = await resend('/emails', m.mail);
      if (!one.ok) console.warn('[email] not sent to', m.mail.to[0], one.status, (await one.text()).slice(0, 200));
      await wait(600); // free plan: 2 requests per second
    }
  } catch (e) {
    console.warn('[email] will retry later:', (e as Error).message);
    await db.rpc('release_emails', { p_ids: [...new Set(mails.map(m => m.id))] });
  }
}

// Call after any action that may create notifications. Runs after the response is sent.
export function sendEmailsSoon() {
  after(() => flushEmails().catch(e => console.warn('[email]', e)));
}

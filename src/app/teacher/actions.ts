'use server';
import { refresh } from 'next/cache';
import { sendEmailsSoon } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

type Result = { error?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const int = (f: FormData, k: string) => Number.parseInt(String(f.get(k) ?? ''), 10);
const date = (f: FormData, k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(str(f, k)) ? str(f, k) : null);

// The database checks everything and explains problems in plain words; show those, hide anything technical.
const FRIENDLY = /Pick|Add the|required|too long|look right|before the start|no longer|sign in|Only teachers/;
async function send(fn: string, args: Record<string, unknown>): Promise<Result> {
  const { error } = await (await createClient()).rpc(fn, args);
  if (error) return { error: FRIENDLY.test(error.message) ? error.message + '.' : 'Could not send your request. Please try again.' };
  refresh();
  sendEmailsSoon();
  return {};
}

export async function requestSupply(f: FormData) {
  return send('request_supply', { p_item: str(f, 'item'), p_qty: int(f, 'qty'), p_room: str(f, 'room'), p_note: str(f, 'note') });
}

export async function requestCustom(f: FormData) {
  return send('request_custom', {
    p_name: str(f, 'name'), p_qty: int(f, 'qty'), p_url: str(f, 'url'), p_needed_by: date(f, 'needed_by'), p_room: str(f, 'room'), p_note: str(f, 'note')
  });
}

export async function requestLaptop(f: FormData) {
  return send('request_laptop', {
    p_type: str(f, 'type'), p_qty: int(f, 'qty'), p_from: date(f, 'from'), p_to: date(f, 'to'), p_room: str(f, 'room'), p_note: str(f, 'note')
  });
}

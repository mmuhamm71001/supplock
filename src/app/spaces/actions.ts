'use server';
import { refresh } from 'next/cache';
import { sendEmailsSoon } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

type Result = { error?: string };

// Space inventory actions, for the space's owner and for admins. The database checks who may do what.
const FRIENDLY = /Give the|Pick|must be|no longer exists|already placed|one of your spaces|too long|Only/;
async function call(fn: string, args: Record<string, unknown>): Promise<Result & { data?: unknown }> {
  const { data, error } = await (await createClient()).rpc(fn, args);
  refresh();
  sendEmailsSoon();
  if (error) return { error: FRIENDLY.test(error.message) ? error.message + '.' : 'Something went wrong. Please try again.' };
  return { data };
}

export async function saveSpaceItem(f: {
  id: string | null; space: string; name: string; category: string; qty: number; unit: string; low_threshold: number; on_loan: boolean; note: string; icon: string;
}) {
  if (!Number.isInteger(f.qty) || !Number.isInteger(f.low_threshold)) return { error: 'Quantities must be whole numbers.' };
  return call('save_space_item', {
    p_id: f.id, p_space: f.space, p_name: f.name, p_category: f.category, p_qty: f.qty, p_unit: f.unit,
    p_low_threshold: f.low_threshold, p_on_loan: f.on_loan, p_note: f.note, p_icon: f.icon
  });
}

export async function adjustSpaceItem(id: string, delta: number) {
  return call('adjust_space_item', { p_id: id, p_delta: delta });
}

export async function removeSpaceItem(id: string) {
  return call('remove_space_item', { p_id: id });
}

export async function saveCount(space: string, lines: { id: string; counted: number }[]) {
  if (lines.some(l => !Number.isInteger(l.counted) || l.counted < 0)) return { error: 'Counts must be whole numbers, 0 or more.' };
  const r = await call('save_space_count', { p_space: space, p_lines: lines });
  return r.error ? { error: r.error } : { result: r.data as { items: number; corrected: number } };
}

// "Where should these go?": a space id adds it there; null means "Don't add".
export async function placeRequest(request: string, space: string | null, onLoan: boolean) {
  return call('place_request', { p_request: request, p_space: space, p_on_loan: onLoan });
}

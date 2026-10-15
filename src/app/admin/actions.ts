'use server';
import { refresh } from 'next/cache';
import { getMe } from '@/lib/auth';
import { removeLogos, uploadLogo } from '@/lib/logo';
import { sendEmailsSoon } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

type Result = { error?: string; code?: string };

async function admin() {
  const me = await getMe();
  if (!me || me.role !== 'admin') throw new Error('Only admins can change school settings.');
  return me;
}

export async function changeLogo(form: FormData): Promise<Result> {
  try {
    const me = await admin();
    const file = form.get('logo');
    if (!(file instanceof File) || !file.size) return { error: 'Please choose an image file.' };
    const url = await uploadLogo(me.school_id, file);
    const { error } = await (await createClient()).rpc('set_school_logo', { p_url: url });
    return error ? { error: 'Could not save the logo. Please try again.' } : {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function removeLogo(): Promise<Result> {
  try {
    const me = await admin();
    const { error } = await (await createClient()).rpc('set_school_logo', { p_url: '' });
    if (error) return { error: 'Could not remove the logo. Please try again.' };
    await removeLogos(me.school_id);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function regenerateCode(): Promise<Result> {
  const { data, error } = await (await createClient()).rpc('regenerate_school_code');
  return error ? { error: 'Could not make a new code. Please try again.' } : { code: data as string };
}

export async function renameSchool(name: string): Promise<Result> {
  const { error } = await (await createClient()).rpc('rename_school', { p_name: name });
  return error ? { error: /Add the school name/.test(error.message) ? 'Add the school name.' : 'Could not rename the school.' } : {};
}

// Approvals ------------------------------------------------------------------------
// The database explains problems in plain words (e.g. not enough laptops); show those, hide anything technical.
const FRIENDLY = /already handled|no longer exists|removed from the inventory|available|Pick|always 1|Only/;
async function decide(fn: string, args: Record<string, unknown>): Promise<Result> {
  const { error } = await (await createClient()).rpc(fn, args);
  refresh();
  sendEmailsSoon();
  if (error) return { error: FRIENDLY.test(error.message) ? error.message + '.' : 'Something went wrong. Please try again.' };
  return {};
}

export async function approve(id: string, qty: number) {
  return decide('approve_request', { p_id: id, p_qty: qty });
}

export async function deny(id: string) {
  return decide('deny_request', { p_id: id });
}

export async function markOrdered(id: string, eta: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eta)) return { error: 'Pick the expected arrival date.' };
  return decide('custom_ordered', { p_id: id, p_eta: eta });
}

export async function markReceived(id: string) {
  return decide('custom_delivered', { p_id: id });
}

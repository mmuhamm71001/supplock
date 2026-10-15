'use server';
import { refresh } from 'next/cache';
import { sendEmailsSoon } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

const FRIENDLY = /Give the|Pick|no longer exists|too long|Only admins/;
async function call(fn: string, args: Record<string, unknown>) {
  const { data, error } = await (await createClient()).rpc(fn, args);
  refresh();
  sendEmailsSoon();
  if (error) return { error: FRIENDLY.test(error.message) ? error.message + '.' : 'Something went wrong. Please try again.' };
  return { data: data as string | null };
}

export async function createSpace(name: string, kind: 'subject' | 'classroom', subject: string, owner: string) {
  return call('create_space', { p_name: name, p_kind: kind, p_subject: subject, p_owner: owner });
}

export async function setSpaceOwner(space: string, owner: string) {
  return call('set_space_owner', { p_space: space, p_owner: owner });
}

export async function deleteSpace(space: string) {
  return call('delete_space', { p_space: space });
}

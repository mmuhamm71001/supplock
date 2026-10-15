'use server';
import { refresh } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Result = { error?: string };

// The database explains problems in plain words; show those, hide anything technical.
const FRIENDLY = /between 1 and 200|no longer exists|already on the cart|returned before|Only admins/;
async function call(fn: string, args: Record<string, unknown>): Promise<Result> {
  const { error } = await (await createClient()).rpc(fn, args);
  refresh();
  if (error) return { error: FRIENDLY.test(error.message) ? error.message + '.' : 'Something went wrong. Please try again.' };
  return {};
}

export async function addLaptops(count: number) {
  return call('add_laptops', { p_count: count });
}

export async function toggleZoom(id: string) {
  return call('toggle_zoom', { p_id: id });
}

export async function returnLaptop(id: string) {
  return call('return_laptop', { p_id: id });
}

export async function removeLaptop(id: string) {
  return call('remove_laptop', { p_id: id });
}

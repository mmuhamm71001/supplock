'use server';
import { refresh } from 'next/cache';
import { getMe } from '@/lib/auth';
import { sendEmailsSoon } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';
import { parseSupplyList, type ImportRow } from '@/lib/xlsx';

type Result = { error?: string };

// The database explains problems in plain words; show those, hide anything technical.
const FRIENDLY = /Add the|must be|already|no longer|doesn't look right|too long|Pick how many|was removed|Row \d+|more than 2000|Only admins|Nothing to import|at least one|more than 100|in the past/;
async function call(fn: string, args: Record<string, unknown>): Promise<Result & { data?: unknown }> {
  const { data, error } = await (await createClient()).rpc(fn, args);
  refresh();
  sendEmailsSoon();
  if (error) return { error: FRIENDLY.test(error.message) ? error.message + '.' : 'Something went wrong. Please try again.' };
  return { data };
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const n = (f: FormData, k: string) => Number(str(f, k).replace(/[$,]/g, ''));

export async function saveItem(f: FormData) {
  const nums = { qty: n(f, 'qty'), th: n(f, 'low_threshold'), size: n(f, 'pack_size'), price: n(f, 'price') };
  if (!Number.isInteger(nums.qty) || !Number.isInteger(nums.th) || !Number.isInteger(nums.size)) return { error: 'Quantities must be whole numbers.' };
  if (Number.isNaN(nums.price)) return { error: 'Price must be a number, like 4.50.' };
  return call('save_item', {
    p_id: str(f, 'id') || null, p_name: str(f, 'name'), p_category: str(f, 'category'), p_unit: str(f, 'unit'),
    p_qty: nums.qty, p_low_threshold: nums.th, p_vendor: str(f, 'vendor'), p_url: str(f, 'url'),
    p_pack_name: str(f, 'pack_name'), p_pack_size: nums.size, p_price: nums.price, p_icon: str(f, 'icon'), p_lendable: str(f, 'lendable') === '1'
  });
}

export async function adjustItem(id: string, delta: number) {
  return call('adjust_item', { p_id: id, p_delta: delta });
}

export async function removeItem(id: string) {
  return call('remove_item', { p_id: id });
}

export async function placeReorder(item: string, packs: number) {
  return call('place_reorder', { p_item: item, p_packs: packs });
}

// A whole order at once: [{item, packs, link}], arriving on eta (YYYY-MM-DD).
export async function logOrder(lines: { item: string; packs: number; link: string }[], eta: string) {
  if (!Array.isArray(lines) || !lines.length) return { error: 'Add at least one item to the order.' };
  const r = await call('log_order', { p_lines: lines, p_eta: /^\d{4}-\d{2}-\d{2}$/.test(eta) ? eta : null });
  return r.error ? { error: r.error } : {};
}

export async function setReorderPacks(id: string, packs: number) {
  return call('set_reorder_packs', { p_id: id, p_packs: packs });
}

export async function receiveReorder(id: string, packs: number) {
  return call('receive_reorder', { p_id: id, p_packs: packs });
}

// Step 1 of importing: read the file and show what would happen. Nothing is saved yet.
export async function previewImport(f: FormData) {
  const me = await getMe();
  if (!me || me.role !== 'admin') return { error: 'Only admins can import.' };
  const file = f.get('file');
  if (!(file instanceof File) || !file.size) return { error: 'Choose a file first.' };
  if (file.size > 5 * 1024 * 1024) return { error: 'That file is larger than 5 MB. Remove extra sheets or pictures and try again.' };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { error: 'Please choose an Excel file (.xlsx) or a .csv file. Older .xls files: open in Excel and "Save As" .xlsx first.' };
  try {
    const parsed = await parseSupplyList(file);
    if (!parsed.rows.length && !parsed.problems.length) parsed.problems.push('No items found under the heading row.');
    const { data } = await (await createClient()).from('items').select('name');
    const existing = new Set((data || []).map(i => i.name.toLowerCase()));
    return { ...parsed, updates: parsed.rows.filter(r => existing.has(r.name.toLowerCase())).map(r => r.name) };
  } catch {
    return { error: 'Couldn’t read that file. Make sure it’s a normal Excel (.xlsx) or .csv file.' };
  }
}

// Step 2: save the previewed rows.
export async function runImport(rows: ImportRow[]) {
  const r = await call('import_items', { p_rows: rows });
  return r.error ? { error: r.error } : { result: r.data as { added: number; updated: number; low: number } };
}

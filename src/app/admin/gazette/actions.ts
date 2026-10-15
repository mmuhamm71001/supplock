'use server';
import { refresh } from 'next/cache';
import { getMe } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

type Result = { error?: string };

// To-dos don't change stock, so admins edit them directly (Row Level Security keeps it to their school).
async function admin() {
  const me = await getMe();
  return me && me.role === 'admin' ? me : null;
}
const clean = (t: string) => t.replace(/\s+/g, ' ').trim().slice(0, 300);

export async function addTodo(text: string): Promise<Result> {
  const me = await admin();
  if (!me) return { error: 'Only admins can edit the to-do list.' };
  if (!clean(text)) return { error: 'Write the notice first.' };
  const { error } = await (await createClient()).from('todos').insert({ school_id: me.school_id, text: clean(text) });
  refresh();
  return error ? { error: 'Could not add it. Please try again.' } : {};
}

export async function setTodoDone(id: string, done: boolean): Promise<Result> {
  if (!(await admin())) return { error: 'Only admins can edit the to-do list.' };
  const { error } = await (await createClient()).from('todos').update({ done }).eq('id', id);
  refresh();
  return error ? { error: 'Could not update it. Please try again.' } : {};
}

export async function editTodo(id: string, text: string): Promise<Result> {
  if (!(await admin())) return { error: 'Only admins can edit the to-do list.' };
  if (!clean(text)) return { error: 'A to-do can’t be empty.' };
  const { error } = await (await createClient()).from('todos').update({ text: clean(text) }).eq('id', id);
  refresh();
  return error ? { error: 'Could not save it. Please try again.' } : {};
}

export async function deleteTodo(id: string): Promise<Result> {
  if (!(await admin())) return { error: 'Only admins can edit the to-do list.' };
  const { error } = await (await createClient()).from('todos').delete().eq('id', id);
  refresh();
  return error ? { error: 'Could not delete it. Please try again.' } : {};
}

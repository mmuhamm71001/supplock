'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { homeFor } from '@/lib/auth';
import { uploadLogo } from '@/lib/logo';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { LAST_CODE_COOKIE, normCode } from '@/lib/school-code';
import type { School } from '@/lib/types';

type Result = { error?: string; code?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

async function rememberCode(code: string) {
  (await cookies()).set(LAST_CODE_COOKIE, code, { maxAge: 60 * 60 * 24 * 400, sameSite: 'lax', path: '/', httpOnly: true });
}

// Public: shows the school's logo and name on the sign-in and join cards.
export async function lookupSchool(code: string): Promise<School | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('school_by_code', { p_code: normCode(code) });
  return (data && data[0]) || null;
}

// Creates a confirmed sign-in account. Teachers and admins sign in with a password.
async function createAccount(email: string, password: string): Promise<{ id?: string; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    if (/already|registered|exists/i.test(error?.message || '')) return { error: 'That email already has a Supplock account. Sign in instead.' };
    if (/password/i.test(error?.message || '')) return { error: 'Choose a stronger password (at least 8 characters).' };
    return { error: 'Could not create your account. Please try again.' };
  }
  return { id: data.user.id };
}

async function signInWith(email: string, password: string) {
  const supabase = await createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

// Who's signed in changed, so pages the browser kept from before are out of date.
const dropCachedPages = () => revalidatePath('/', 'layout');

export async function signIn(form: FormData): Promise<Result> {
  const code = normCode(str(form, 'code'));
  const email = str(form, 'email').toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!code) return { error: 'Enter your school code.' };
  if (!EMAIL_RE.test(email) || !password) return { error: 'Enter your school email and password.' };
  const school = await lookupSchool(code);
  if (!school) return { error: "We couldn't find a school with that code. Check with your admin." };

  const { data, error } = await signInWith(email, password);
  if (error || !data.user) return { error: 'That email and password don’t match. Try again or reset your password.' };

  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('role, school_id').eq('id', data.user.id).maybeSingle();
  if (!profile || profile.school_id !== school.id) {
    await supabase.auth.signOut({ scope: 'local' });
    return { error: `No account with that email at ${school.name}. New here? Join as teacher.` };
  }
  await rememberCode(school.code);
  dropCachedPages();
  redirect(homeFor(profile.role));
}

export async function joinSchool(form: FormData): Promise<Result> {
  const code = normCode(str(form, 'code'));
  const name = str(form, 'name');
  const email = str(form, 'email').toLowerCase();
  const room = str(form, 'room');
  const password = String(form.get('password') ?? '');
  const school = code ? await lookupSchool(code) : null;
  if (!school) return { error: "That school code doesn't match any school yet." };
  if (!name || !EMAIL_RE.test(email)) return { error: 'Add your name and a school email.' };
  if (password.length < MIN_PASSWORD) return { error: `Choose a password with at least ${MIN_PASSWORD} characters.` };

  const acct = await createAccount(email, password);
  if (!acct.id) return { error: acct.error };
  const admin = createAdminClient();
  const { error } = await admin.rpc('join_school', { p_user: acct.id, p_code: code, p_name: name, p_email: email, p_room: room });
  if (error) {
    await admin.auth.admin.deleteUser(acct.id);
    return { error: /email to join|plan's limit/.test(error.message) ? error.message + '.' : 'Could not join the school. Please try again.' };
  }
  await signInWith(email, password);
  await rememberCode(school.code);
  dropCachedPages();
  redirect('/teacher');
}

export async function registerSchool(form: FormData): Promise<Result> {
  const schoolName = str(form, 'school');
  const name = str(form, 'name');
  const email = str(form, 'email').toLowerCase();
  const password = String(form.get('password') ?? '');
  const logo = form.get('logo');
  if (!schoolName || !name || !EMAIL_RE.test(email)) return { error: 'Add the school name, your name and your email.' };
  if (password.length < MIN_PASSWORD) return { error: `Choose a password with at least ${MIN_PASSWORD} characters.` };

  const acct = await createAccount(email, password);
  if (!acct.id) return { error: acct.error };
  const admin = createAdminClient();
  const { data: school, error } = await admin.rpc('create_school', { p_user: acct.id, p_school_name: schoolName, p_admin_name: name, p_email: email });
  if (error || !school) {
    await admin.auth.admin.deleteUser(acct.id);
    return { error: 'Could not create the school. Please try again.' };
  }
  const s = school as School;
  if (logo instanceof File && logo.size > 0) {
    try {
      const url = await uploadLogo(s.id, logo);
      await admin.from('schools').update({ logo_url: url }).eq('id', s.id);
    } catch {
      // The school still works without a logo; it can be added from the dashboard.
    }
  }
  await signInWith(email, password);
  await rememberCode(s.code);
  dropCachedPages();
  return { code: s.code };
}

export async function sendPasswordReset(form: FormData): Promise<Result> {
  const email = str(form, 'email').toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: 'Enter the email you sign in with.' };
  const h = await headers();
  const origin = h.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
  // Until the email template can be edited (it needs our own email service), Supabase's
  // standard link is used. The "implicit" kind works in any browser, not just this one.
  const supabase = createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'implicit', persistSession: false } });
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });
  if (error && /rate|too many/i.test(error.message)) return { error: 'Too many reset emails were sent. Please wait a few minutes and try again.' };
  // Same answer whether or not the email has an account.
  return {};
}

export async function setNewPassword(form: FormData): Promise<Result> {
  const password = String(form.get('password') ?? '');
  if (password.length < MIN_PASSWORD) return { error: `Choose a password with at least ${MIN_PASSWORD} characters.` };
  const supabase = await createClient();
  const token = str(form, 'token_hash');
  const access = str(form, 'access_token');
  const refresh = str(form, 'refresh_token');
  if (token || access) {
    const { error } = token
      ? await supabase.auth.verifyOtp({ type: 'recovery', token_hash: token })
      : await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    if (error) return { error: 'This reset link has expired or was already used. Ask for a new one.' };
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'This reset link has expired. Ask for a new one.' };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: /same|different/i.test(error.message) ? 'Choose a password you haven’t used before.' : 'Could not change your password. Please try again.' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  dropCachedPages();
  redirect(profile ? homeFor(profile.role) : '/login');
}

export async function signOut() {
  const supabase = await createClient();
  // Only this device: logging out of a shared classroom computer shouldn't sign the person out on their phone.
  await supabase.auth.signOut({ scope: 'local' });
  dropCachedPages();
  redirect('/login');
}

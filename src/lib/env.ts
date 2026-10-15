// Reads Supabase settings. Returns '' when missing so the setup page can explain what to fill in.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const hasSupabaseEnv = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

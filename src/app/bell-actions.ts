'use server';
import { createClient } from '@/lib/supabase/server';

// Marks the signed-in person's notifications as read (and the admin inbox, for admins).
export async function markNotificationsRead() {
  await (await createClient()).rpc('mark_notifications_read');
}

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

// Saves a (browser-resized) logo to the public "logos" bucket and returns its URL.
// Old logos for the school are removed. The caller must have checked permission.
export async function uploadLogo(schoolId: string, file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error('Please choose a PNG, JPG or WebP image.');
  if (file.size > 1024 * 1024) throw new Error('That image is too large. Try a smaller one.');
  const admin = createAdminClient();
  const path = `${schoolId}/logo-${Date.now()}.${ext}`;
  const { error } = await admin.storage.from('logos').upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error('Could not save the logo. Please try again.');
  await removeLogos(schoolId, path);
  return admin.storage.from('logos').getPublicUrl(path).data.publicUrl;
}

export async function removeLogos(schoolId: string, keep?: string) {
  const admin = createAdminClient();
  const { data } = await admin.storage.from('logos').list(schoolId);
  const old = (data || []).map(f => `${schoolId}/${f.name}`).filter(p => p !== keep);
  if (old.length) await admin.storage.from('logos').remove(old);
}

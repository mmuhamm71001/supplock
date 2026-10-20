// Turns a product link into a key that stays the same however it was copied: Amazon, Walmart and
// Target links keep only their product number; other links drop "www.", tracking bits and the trailing slash.
// "amazon.com/Crayola-Markers/dp/B00004UE6I?th=1" and "https://www.amazon.com/dp/B00004UE6I" both → "amazon:B00004UE6I".
export function linkKey(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(text) ? text : 'https://' + text); } catch { return ''; }
  const host = u.hostname.toLowerCase().replace(/^(www|smile|m)\./, '');
  const path = decodeURIComponent(u.pathname);
  const site = host.split('.').slice(-2, -1)[0] || host;
  const amazon = site === 'amazon' && path.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin)\/([A-Z0-9]{10})/i);
  if (amazon) return 'amazon:' + amazon[1].toUpperCase();
  const walmart = site === 'walmart' && path.match(/\/ip\/(?:[^/]+\/)?(\d+)/);
  if (walmart) return 'walmart:' + walmart[1];
  const target = site === 'target' && path.match(/\/A-(\d+)/i);
  if (target) return 'target:' + target[1];
  return host + path.toLowerCase().replace(/\/+$/, '');
}

// Splits pasted text into links (one per line, or separated by spaces or commas).
export const splitLinks = (text: string) => [...new Set(text.split(/[\s,]+/).map(s => s.trim()).filter(s => /\.[a-z]{2,}/i.test(s)))];

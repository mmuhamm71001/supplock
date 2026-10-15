export const normCode = (c: string) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
export const looksLikeCode = (c: string) => /^[A-Z]{1,5}-\d{4}$/.test(normCode(c));
export const LAST_CODE_COOKIE = 'sl_last_code';

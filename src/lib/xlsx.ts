import 'server-only';
import ExcelJS from 'exceljs';

type Cell = string | number | null | undefined;
export type Sheet = { name: string; rows: Record<string, Cell>[]; columns?: string[] };

// "Manara Academy" + "main-inventory" + "2026-10-14" → "Manara-Academy-main-inventory-2026-10-14.xlsx"
const fileSafe = (x: string) => x.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
export const exportName = (school: string, what: string, day: string) => `${fileSafe(school) || 'Supplock'}-${fileSafe(what)}-${day}.xlsx`;

// A real .xlsx with a bold header row and columns sized to fit their content.
export async function buildWorkbook(sheets: Sheet[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Supplock';
  const used = new Set<string>();
  for (const sh of sheets) {
    const rows = sh.rows.length || sh.columns ? sh.rows : [{ Note: 'Nothing here yet' }];
    const keys = sh.columns || Object.keys(rows[0]);
    let name = (sh.name || 'Sheet').replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet';
    for (let k = 2; used.has(name); k++) name = name.slice(0, 28) + ' ' + k;
    used.add(name);
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = keys.map(k => ({
      header: k, key: k,
      width: Math.max(10, Math.min(48, Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)) + 2))
    }));
    ws.getRow(1).font = { bold: true };
    rows.forEach(r => ws.addRow(r));
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

// ---------------------------------------------------------------------- import
export type ImportRow = {
  name: string; category?: string; unit?: string; qty?: number; low_threshold?: number; vendor?: string; url?: string;
  pack_name?: string; pack_size?: number; price?: number;
};

// Column headings we understand, written the way people tend to write them.
const HEADERS: [keyof ImportRow | 'pack', RegExp][] = [
  ['name', /^(item|items|item name|name|product|description|supply|supplies)$/],
  ['category', /^(category|type|group|section)$/],
  ['unit', /^(unit|units|base unit|uom|unit of measure|counted in)$/],
  ['qty', /^(quantity|qty|stock|in stock|on hand|count|current quantity|amount)$/],
  ['low_threshold', /^(low.?stock threshold|threshold|low at|low alert( at)?|reorder (point|level|at)|min(imum)?( stock)?|par( level)?)$/],
  ['vendor', /^(vendor|supplier|preferred vendor|store|shop|seller)$/],
  ['url', /^(link|url|product link|website|web link)$/],
  ['pack_name', /^(purchase unit|pack name|sold as|buy as)$/],
  ['pack_size', /^(units per (purchase|pack|box|case)|pack size|per pack|qty per pack|case size)$/],
  ['price', /^(price( per (base )?unit)?|unit price|cost( per unit)?|unit cost)( \(\$\))?$/],
  ['pack', /^pack$/]  // our own export writes "1 box = 10 reams"
];

const norm = (h: string) => h.toLowerCase().replace(/[_*:]+/g, ' ').replace(/\s+/g, ' ').trim();

const text = (v: ExcelJS.CellValue): string => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if ('text' in v && typeof v.text === 'string') return v.text;                          // hyperlink
    if ('hyperlink' in v && typeof v.hyperlink === 'string') return v.hyperlink;
    if ('result' in v) return text(v.result as ExcelJS.CellValue);                          // formula
    if ('richText' in v) return v.richText.map(t => t.text).join('');
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return '';
  }
  return String(v);
};
// For the link column, a clickable cell's web address matters, not its label.
const link = (v: ExcelJS.CellValue): string =>
  v && typeof v === 'object' && 'hyperlink' in v && typeof v.hyperlink === 'string' ? v.hyperlink : text(v);
const LABEL: Record<string, string> = { qty: 'quantity', low_threshold: 'low-stock threshold', pack_size: 'units per purchase', price: 'price' };
const num = (s: string) => {
  const n = Number(s.replace(/[$,\s]/g, ''));
  return s.trim() === '' || Number.isNaN(n) ? undefined : n;
};

export type Parsed = { rows: ImportRow[]; columns: string[]; ignored: string[]; problems: string[] };

// Reads the first sheet of an .xlsx (or a .csv). The first row with an item-name column is the header row.
export async function parseSupplyList(file: File): Promise<Parsed> {
  const wb = new ExcelJS.Workbook();
  const buf = Buffer.from(await file.arrayBuffer());
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
    const { Readable } = await import('node:stream');
    await wb.csv.read(Readable.from(buf));
  } else {
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  }
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], columns: [], ignored: [], problems: ['That file has no sheets.'] };

  let headerRow = 0;
  const map = new Map<number, keyof ImportRow | 'pack'>();
  const ignored: string[] = [];
  for (let r = 1; r <= Math.min(ws.rowCount, 10) && !headerRow; r++) {
    const cells = ws.getRow(r).values as ExcelJS.CellValue[];
    const found = new Map<number, keyof ImportRow | 'pack'>();
    cells.forEach((v, c) => { const h = norm(text(v)); const m = HEADERS.find(([, re]) => re.test(h)); if (m && ![...found.values()].includes(m[0])) found.set(c, m[0]); });
    if ([...found.values()].includes('name')) {
      headerRow = r;
      found.forEach((k, c) => map.set(c, k));
      cells.forEach((v, c) => { const h = text(v).trim(); if (h && !found.has(c)) ignored.push(h); });
    }
  }
  if (!headerRow) return { rows: [], columns: [], ignored: [], problems: ['Couldn’t find a column for the item name. Name the first column "Item" and try again.'] };

  const rows: ImportRow[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const cells = ws.getRow(r).values as ExcelJS.CellValue[];
    const row: Partial<ImportRow> = {};
    map.forEach((key, c) => {
      const s = (key === 'url' ? link(cells[c]) : text(cells[c])).trim();
      if (!s) return;
      if (key === 'pack') {
        const m = s.match(/^1\s+(.+?)\s*=\s*(\d+)/);
        if (m) { row.pack_name = m[1]; row.pack_size = Number(m[2]); }
      } else if (key === 'qty' || key === 'low_threshold' || key === 'pack_size' || key === 'price') {
        const n = num(s);
        if (n === undefined || n < 0) problems.push(`Row ${r}: "${s}" isn't a number (${LABEL[key]}), so it was left blank.`);
        else row[key] = key === 'price' ? Math.round(n * 100) / 100 : Math.round(n);
      } else {
        row[key] = s;
      }
    });
    if (!row.name) continue;
    const k = row.name.toLowerCase();
    if (seen.has(k)) { problems.push(`Row ${r}: "${row.name}" is listed twice. Only the first one is used.`); continue; }
    seen.add(k);
    if (row.pack_size === 0) row.pack_size = 1;
    rows.push(row as ImportRow);
  }
  const NAMES: Record<string, string> = { name: 'item', category: 'category', unit: 'unit', qty: 'quantity', low_threshold: 'low-stock threshold', vendor: 'vendor',
    url: 'link', pack_name: 'purchase unit', pack_size: 'units per purchase', price: 'price', pack: 'pack' };
  const columns = [...new Set(map.values())].map(k => NAMES[k]);
  return { rows, columns, ignored, problems: problems.slice(0, 20) };
}

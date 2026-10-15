'use client';
import { useState, useTransition, type CSSProperties } from 'react';
import { ErrorText } from '@/components/form';
import { isoPlus } from '@/lib/format';
import type { ImportRow } from '@/lib/xlsx';
import { previewImport, runImport } from './actions';

type Preview = { rows: ImportRow[]; columns: string[]; ignored: string[]; problems: string[]; updates: string[] };

const btn: CSSProperties = { minHeight: 48, padding: '0 18px', border: 'none', borderRadius: 14, background: '#8351a8', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #5e3680' };
const link: CSSProperties = { minHeight: 44, padding: '0 6px', border: 'none', background: 'none', color: '#5c4766', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' };

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<{ added: number; updated: number; low: number } | null>(null);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const pick = (file?: File) => {
    if (!file) return;
    const f = new FormData();
    f.set('file', file);
    setErr(''); setPreview(null);
    start(async () => { const r = await previewImport(f); if ('error' in r && r.error) setErr(r.error); else setPreview(r as Preview); });
  };
  const save = () => start(async () => {
    if (!preview) return;
    const r = await runImport(preview.rows);
    if (r.error) setErr(r.error); else if (r.result) setDone(r.result);
  });

  const updates = new Set(preview?.updates.map(n => n.toLowerCase()));
  const adds = preview ? preview.rows.length - updates.size : 0;

  return (
    <dialog className="sl-modal" aria-label="Import from Excel" style={{ maxWidth: 640 }} ref={el => { if (el && !el.open) el.showModal(); }}
      onClose={onClose} onClick={e => { if (e.target === e.currentTarget && !pending) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 28, padding: 24, boxShadow: '0 8px 0 #c2abd4,0 30px 60px rgba(46,15,56,.3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, margin: 0 }}>Import from Excel</h2>
            <div style={{ fontSize: 14, color: '#5c4766', marginTop: 4 }}>Upload your supply list (.xlsx or .csv). You&apos;ll see what changes before anything is saved.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ flex: 'none', width: 44, height: 44, borderRadius: 14, border: 'none', background: '#f1eaf5', fontSize: 20, cursor: 'pointer', color: '#2e0f38' }}>×</button>
        </div>

        {done ? (
          <>
            <div role="status" style={{ fontSize: 17, lineHeight: 1.5 }}>
              <strong>Done.</strong> {done.added} new {done.added === 1 ? 'item' : 'items'} added and {done.updated} updated.
              {done.low > 0 && <> {done.low} {done.low === 1 ? 'is' : 'are'} low or out of stock, so check the shopping list below.</>}
            </div>
            <button type="button" autoFocus onClick={onClose} style={btn}>Close</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, background: '#f1eaf5', borderRadius: 14, padding: '12px 14px', lineHeight: 1.5 }}>
              The first column should be the <strong>item name</strong>. Other columns are optional: quantity, unit, category, low-stock threshold,
              vendor, price per unit, link, purchase unit and units per purchase. Items that already exist (same name) are updated; the rest are added.{' '}
              <a href={`/admin/inventory/export?template=1&d=${isoPlus(0)}`} style={{ fontWeight: 700 }}>
                Download a blank template
              </a>
            </div>
            <label style={{ ...btn, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', background: '#fff', color: '#2e0f38', border: '2px solid #2e0f38', boxShadow: '0 4px 0 #2e0f38' }}>
              {pending && !preview ? 'Reading…' : preview ? 'Choose a different file' : 'Choose file'}
              <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="sr-only"
                onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>

            {preview && (
              <>
                <div style={{ fontSize: 15, lineHeight: 1.5 }}>
                  Found <strong>{preview.rows.length}</strong> {preview.rows.length === 1 ? 'item' : 'items'}: <strong>{adds}</strong> new, <strong>{updates.size}</strong> to update.
                  <div style={{ fontSize: 13, color: '#5c4766' }}>
                    Columns used: {preview.columns.join(', ')}.{preview.ignored.length > 0 && <> Ignored: {preview.ignored.join(', ')}.</>}
                  </div>
                </div>
                {preview.problems.length > 0 && (
                  <ul style={{ margin: 0, padding: '10px 14px 10px 30px', background: '#f1dff3', borderRadius: 12, fontSize: 14, color: '#6e2c74' }}>
                    {preview.problems.map(p => <li key={p}>{p}</li>)}
                  </ul>
                )}
                {preview.rows.length > 0 && (
                  <div style={{ maxHeight: 260, overflow: 'auto', border: '2px solid #efe7f3', borderRadius: 14 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ textAlign: 'left', color: '#5c4766', position: 'sticky', top: 0, background: '#fff' }}>
                        <th style={{ padding: '8px 10px' }}>Item</th><th style={{ padding: 8 }}>Qty</th><th style={{ padding: 8 }}>Unit</th><th style={{ padding: 8 }}>Low at</th><th style={{ padding: 8 }}>Pack</th><th style={{ padding: 8 }}></th>
                      </tr></thead>
                      <tbody>
                        {preview.rows.map(r => (
                          <tr key={r.name} style={{ borderTop: '1px solid #efe7f3' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 700 }}>{r.name}</td>
                            <td style={{ padding: 6, fontFamily: 'var(--font-mono)' }}>{r.qty ?? '–'}</td>
                            <td style={{ padding: 6 }}>{r.unit ?? '–'}</td>
                            <td style={{ padding: 6, fontFamily: 'var(--font-mono)' }}>{r.low_threshold ?? '–'}</td>
                            <td style={{ padding: 6 }}>{r.pack_size ? `${r.pack_name || 'pack'} of ${r.pack_size}` : '–'}</td>
                            <td style={{ padding: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: updates.has(r.name.toLowerCase()) ? '#dde2ee' : '#dce8ee', color: '#1a2c54' }}>
                                {updates.has(r.name.toLowerCase()) ? 'update' : 'new'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            <ErrorText>{err}</ErrorText>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" disabled={!preview?.rows.length || pending} onClick={save} style={{ ...btn, opacity: !preview?.rows.length || pending ? 0.5 : 1 }}>
                {pending && preview ? 'Importing…' : preview?.rows.length ? `Import ${preview.rows.length} ${preview.rows.length === 1 ? 'item' : 'items'}` : 'Import'}
              </button>
              <button type="button" onClick={onClose} style={link}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

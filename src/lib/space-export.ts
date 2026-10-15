import 'server-only';
import { spaceLevel, type SpaceCount, type SpaceItem } from './space-shared';

const status = (i: SpaceItem) => ({ ok: 'OK', low: 'Low', out: 'Out' })[spaceLevel(i)];

export const spaceRows = (items: SpaceItem[]) => items.map(i => ({
  Item: i.name, Category: i.category, Quantity: i.qty, Unit: i.unit, 'Low alert at': i.low_threshold || '', Status: status(i),
  'On loan from main closet': i.on_loan ? 'Yes' : 'No', Note: i.note
}));

export const countRows = (counts: SpaceCount[]) => counts.flatMap(c => c.lines.map(l => ({
  Date: c.counted_at.slice(0, 10), 'Counted by': c.counted_by_name, Item: l.name, 'On record': l.expected, Counted: l.counted,
  Difference: l.counted - l.expected, 'Previous count': l.prev ?? ''
})));

export const download = (file: ArrayBuffer, name: string) => new Response(file, {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${name}"`,
    'Cache-Control': 'no-store'
  }
});

export const dayParam = (d: string | null) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d! : new Date().toISOString().slice(0, 10));

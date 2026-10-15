// Space types and rules shared by the server and the browser.

export type SpaceItem = { id: string; name: string; category: string; qty: number; unit: string; low_threshold: number; on_loan: boolean; note: string; icon: string | null };
export type CountLine = { item_id: string; name: string; unit: string; expected: number; counted: number; prev: number | null };
export type SpaceCount = { id: string; counted_at: string; counted_by_name: string; lines: CountLine[] };
export type Space = { id: string; name: string; kind: 'classroom' | 'subject'; subject: string; owner_id: string | null; owner: string };
export type SpaceData = { space: Space; items: SpaceItem[]; counts: SpaceCount[] };

export const CATS = ['Supplies', 'Equipment', 'Books', 'Furniture'] as const;
export const spaceLevel = (i: { qty: number; low_threshold: number }) => (!i.low_threshold ? 'ok' : i.qty === 0 ? 'out' : i.qty < i.low_threshold ? 'low' : 'ok');

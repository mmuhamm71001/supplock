import type { RequestRow } from '@/lib/format';

export type GItem = { id: string; name: string; unit: string; qty: number; low_threshold: number; vendor: string; url: string; pack_name: string; pack_size: number; price: number; icon: string | null };
export type GReorder = { id: string; item_id: string | null; packs: number; eta: string | null };
export type GRequest = RequestRow & { teacher: string; item_id: string | null };
export type GTodo = { id: string; text: string; done: boolean; auto: boolean; item_id: string | null; link: string; due: string | null };
export type GLaptop = { id: string; tag: string; status: 'available' | 'out' | 'assigned'; zoom: boolean; room: string; holder: string };
export type GLog = { id: string; ts: string; action: string; teacher_name: string; item_label: string; qty: string; room: string; result: string };
export type GazetteData = { items: GItem[]; reorders: GReorder[]; requests: GRequest[]; todos: GTodo[]; laptops: GLaptop[]; log: GLog[] };

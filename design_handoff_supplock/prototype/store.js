// Supplock shared in-memory store, mirrored to localStorage so every page sees the same data.
const KEY = 'supplock-db-v1';
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const isoPlus = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const fmtDate = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DAY[dt.getDay()]}, ${MON[m - 1]} ${d}`; };
export const fmtTime = ts => { const d = new Date(ts); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`; };
export const fmtStamp = ts => { const d = new Date(ts); const today = new Date().toDateString() === d.toDateString(); return (today ? 'Today' : `${MON[d.getMonth()]} ${d.getDate()}`) + ' · ' + fmtTime(ts); };
const ago = m => Date.now() - m * 60000;
let uid = Date.now() % 100000;
const id = p => p + (++uid);

function seed() {
  const items = [
    ['gs','Glue sticks','Art','sticks',0,24,'pack',30,'Amazon',0.42],
    ['mk','Dry-erase markers','Writing','markers',4,12,'pack',12,'Amazon',0.95],
    ['wp','Disinfecting wipes','Cleaning','canisters',6,10,'3-pack',3,"Sam's Club",4.3],
    ['ts','Tissues','Cleaning','boxes',22,30,'case',12,'Target',1.6],
    ['cp','Copy paper','Paper','reams',48,20,'box',10,"Sam's Club",5.2],
    ['cr','Crayons','Art','boxes',40,15,'case',24,'Target',0.99],
    ['pn','No. 2 pencils','Writing','pencils',180,60,'box',96,'Amazon',0.12],
    ['cs','Construction paper','Paper','packs',14,8,'bundle',6,'Walmart',3.4],
    ['hs','Hand sanitizer','Cleaning','bottles',11,8,'case',6,"Sam's Club",3.1],
    ['sc','Scissors','Classroom','pairs',26,10,'pack',12,'Target',1.1],
    ['ix','Index cards','Paper','packs',30,12,'box',10,'Amazon',1.3],
    ['ep','Earbuds','Tech','pairs',9,15,'pack',20,'Amazon',0.85]
  ].map(([id, name, cat, unit, qty, th, pk, pn, vendor, price]) => ({ id, name, cat, unit, qty, th, pk, pn, vendor, price, url: `https://www.${vendor === "Sam's Club" ? 'samsclub' : vendor.toLowerCase()}.com/` }));
  const users = [
    { id: 'admin', name: 'J. Ruiz', role: 'admin', email: 'jruiz@school.org' },
    { id: 't1', name: 'Ms. Alvarez', role: 'teacher', room: 'Rm 108', email: 'alvarez@school.org' },
    { id: 't2', name: 'Mr. Chen', role: 'teacher', room: 'Rm 115', email: 'chen@school.org' },
    { id: 't3', name: 'Ms. Patel', role: 'teacher', room: 'Rm 204', email: 'patel@school.org' },
    { id: 't4', name: 'Mr. Okafor', role: 'teacher', room: 'Rm 120', email: 'okafor@school.org' },
    { id: 't5', name: 'Ms. Rivera', role: 'teacher', room: 'Rm 210', email: 'rivera@school.org' },
    { id: 't6', name: 'Mr. Brooks', role: 'teacher', room: 'Rm 112', email: 'brooks@school.org' },
    { id: 't7', name: 'Ms. Nguyen', role: 'teacher', room: 'Rm 301', email: 'nguyen@school.org' }
  ];
  const laptops = Array.from({ length: 30 }, (_, i) => ({ tag: 'LT-' + String(i + 1).padStart(3, '0'), status: 'available', zoom: i % 4 !== 3, holder: null, room: '', until: '' }));
  const setL = (n, p) => Object.assign(laptops[n - 1], p);
  setL(1, { status: 'assigned', holder: 't3', room: 'Rm 204' }); setL(7, { status: 'assigned', holder: 't6', room: 'Rm 112' });
  setL(13, { status: 'assigned', holder: 't7', room: 'Rm 301' }); setL(19, { status: 'assigned', holder: 't4', room: 'Rm 120' });
  [2, 3, 4, 5, 6, 8, 9, 10].forEach(n => setL(n, { status: 'out', holder: 't1', room: 'Rm 108', until: isoPlus(2) }));
  const requests = [
    { id: 'r1', kind: 'supply', teacherId: 't1', room: 'Rm 108', itemId: 'mk', qty: 12, note: 'Whiteboard relay on Friday', status: 'pending', ts: ago(95) },
    { id: 'r2', kind: 'laptop', teacherId: 't2', room: 'Rm 115', type: 'temp', qty: 6, from: isoPlus(4), to: isoPlus(6), note: 'State testing', status: 'pending', ts: ago(70) },
    { id: 'r3', kind: 'supply', teacherId: 't4', room: '', itemId: 'cp', qty: 5, note: '', status: 'pending', ts: ago(42) },
    { id: 'r4', kind: 'laptop', teacherId: 't5', room: 'Rm 210', type: 'full', qty: 1, note: 'For our reading station', status: 'pending', ts: ago(18) },
    { id: 'c1', kind: 'custom', teacherId: 't3', room: 'Rm 204', name: 'Wobble cushions', qty: 2, url: 'https://www.amazon.com/wobble-cushion', needed: isoPlus(14), note: 'For two students who need to move', status: 'pending', ts: ago(130) },
    { id: 'c2', kind: 'custom', teacherId: 't6', room: 'Rm 112', name: 'Mini whiteboards', qty: 24, url: 'https://www.walmart.com/mini-whiteboards', needed: isoPlus(23), status: 'ordered', eta: isoPlus(6), ts: ago(4000) },
    { id: 'c3', kind: 'custom', teacherId: 't7', room: 'Rm 301', name: 'Electric pencil sharpener', qty: 1, url: 'https://www.target.com/pencil-sharpener', needed: isoPlus(10), status: 'approved', ts: ago(2600) },
    { id: 'r5', kind: 'supply', teacherId: 't3', room: 'Rm 204', itemId: 'gs', qty: 12, status: 'approved', ts: ago(200) },
    { id: 'r6', kind: 'supply', teacherId: 't1', room: 'Rm 108', itemId: 'ts', qty: 4, status: 'approved', ts: ago(3000) },
    { id: 'r7', kind: 'supply', teacherId: 't1', room: '', itemId: 'sc', qty: 30, status: 'denied', ts: ago(5000) }
  ];
  const todos = [
    { id: 'td1', text: 'Order more Glue sticks', auto: true, itemId: 'gs' },
    { id: 'td2', text: 'Order more Dry-erase markers', auto: true, itemId: 'mk' },
    { id: 'td3', text: 'Order more Disinfecting wipes', auto: true, itemId: 'wp' },
    { id: 'td9', text: 'Order more Earbuds', auto: true, itemId: 'ep' },
    { id: 'td4', text: 'Order Wobble cushions', auto: true, link: 'https://www.amazon.com/wobble-cushion', due: isoPlus(14), reqId: 'c1' },
    { id: 'td5', text: 'Order Electric pencil sharpener', auto: true, link: 'https://www.target.com/pencil-sharpener', due: isoPlus(10), reqId: 'c3' },
    { id: 'td6', text: "Call Sam's Club about bulk pricing" },
    { id: 'td7', text: 'Order Mini whiteboards', auto: true, done: true, reqId: 'c2' },
    { id: 'td8', text: 'Count laptops in cart B', done: true }
  ];
  const reorders = [
    { id: 'o1', itemId: 'ts', packs: 2, placed: isoPlus(-2), eta: isoPlus(3), status: 'ordered' },
    { id: 'o0', itemId: 'cp', packs: 3, placed: isoPlus(-12), eta: isoPlus(-8), status: 'received', received: 3 }
  ];
  const L = (m, action, p) => ({ id: id('l'), ts: ago(m), action, teacher: '', item: '', qty: '', result: '', room: '', ...p });
  const log = [
    L(18, 'Requested', { teacher: 'Ms. Rivera', item: 'Laptop · full-time class use', qty: 1, room: 'Rm 210' }),
    L(42, 'Requested', { teacher: 'Mr. Okafor', item: 'Copy paper', qty: 5, result: '48 reams' }),
    L(70, 'Requested', { teacher: 'Mr. Chen', item: 'Laptops · temporary', qty: 6, room: 'Rm 115' }),
    L(95, 'Requested', { teacher: 'Ms. Alvarez', item: 'Dry-erase markers', qty: 12, room: 'Rm 108', result: '4 markers · exceeds stock' }),
    L(130, 'Requested', { teacher: 'Ms. Patel', item: 'Custom: Wobble cushions', qty: 2, room: 'Rm 204' }),
    L(199, 'Deducted', { teacher: 'Ms. Patel', item: 'Glue sticks', qty: -12, room: 'Rm 204', result: '0 sticks · out of stock' }),
    L(199, 'Approved', { teacher: 'Ms. Patel', item: 'Glue sticks', qty: 12, room: 'Rm 204', result: 'by J. Ruiz' }),
    L(260, 'Adjustment', { item: 'Crayons', qty: 2, result: '40 boxes' }),
    L(2880, 'Reorder placed', { item: 'Tissues', qty: '2 cases', result: 'arrives ' + fmtDate(isoPlus(3)) }),
    L(2950, 'Laptop checkout', { teacher: 'Ms. Alvarez', item: '8 laptops (LT-002…LT-010)', qty: 8, room: 'Rm 108', result: '18 available' }),
    L(11000, 'Received', { item: 'Copy paper', qty: 30, result: '58 reams' })
  ];
  const notes = [
    { id: 'n1', to: 'admin', kind: 'request', text: 'New laptop request from Ms. Rivera (full-time, Rm 210)', ts: ago(18) },
    { id: 'n2', to: 'admin', kind: 'urgent', text: '⚠️ Request from Ms. Alvarez exceeds current stock for Dry-erase markers', ts: ago(95) },
    { id: 'n3', to: 'admin', kind: 'low', text: 'Glue sticks are out of stock (0 left). Suggested: order 2 packs = 60 sticks', ts: ago(199) },
    { id: 'n4', to: 't3', kind: 'status', text: 'Your request for 12 Glue sticks was approved', ts: ago(199) },
    { id: 'n5', to: 't1', kind: 'status', text: 'Your request for 30 Scissors was denied', ts: ago(5000), read: true }
  ];
  return { v: 1, session: null, users, items, laptops, requests, todos, reorders, log, notes };
}

// ---------- spaces migration / demo data ----------
function addSpaces(x, demo) {
  if (x.spaces) return;
  x.spaces = []; x.spaceItems = []; x.counts = [];
  x.users.filter(u => u.role === 'teacher').forEach(u => x.spaces.push({ id: 'sp-' + u.id, name: u.room ? 'Classroom · ' + u.room : u.name + "'s classroom", kind: 'classroom', subject: '', ownerId: u.id }));
  if (!demo || !x.users.some(u => u.id === 't7')) return;
  x.spaces.push({ id: 'sp-sci', name: 'Science Lab', kind: 'subject', subject: 'Science', ownerId: 't7' }, { id: 'sp-pe', name: 'Gym', kind: 'subject', subject: 'PE', ownerId: 't4' }, { id: 'sp-art', name: 'Art Room', kind: 'subject', subject: 'Art', ownerId: 't3' });
  let n = 0;
  const I = (sp, name, cat, qty, th, unit, extra) => { const it = { id: 'si' + (++n), spaceId: sp, name, cat, qty, th, unit, loan: false, note: '', icon: '', ...extra }; x.spaceItems.push(it); return it; };
  const C = (sp, days, by, items, counted) => x.counts.push({ id: 'ct' + (++n), spaceId: sp, ts: ago(days * 1440), by, lines: items.map((it, i) => ({ id: it.id, name: it.name, unit: it.unit, expected: counted[i] + (i === 0 ? 1 : 0), counted: counted[i], prev: null })) });
  const a = [I('sp-t1', 'Glue sticks', 'Supplies', 6, 4, 'sticks', { icon: 'glue' }), I('sp-t1', 'Dry-erase markers', 'Supplies', 3, 4, 'markers', { icon: 'markers' }), I('sp-t1', 'Tissues', 'Supplies', 2, 2, 'boxes', { icon: 'tissues' }),
    I('sp-t1', 'Leveled readers', 'Books', 42, 0, 'books'), I('sp-t1', 'Read-aloud picture books', 'Books', 18, 0, 'books'), I('sp-t1', 'Student desks', 'Furniture', 24, 0, 'desks'), I('sp-t1', 'Reading rug', 'Furniture', 1, 0, 'rug'),
    I('sp-t1', 'Laptops LT-002 – LT-010', 'Equipment', 8, 0, 'laptops', { icon: 'laptop', loan: true, note: 'due back ' + fmtDate(isoPlus(2)) }), I('sp-t1', 'Electric pencil sharpener', 'Equipment', 1, 0, 'sharpener', { icon: 'sharpener' })];
  C('sp-t1', 14, 'Ms. Alvarez', a, [10, 8, 4, 44, 18, 24, 1, 0, 1]);
  const b = [I('sp-sci', 'Microscopes', 'Equipment', 12, 10, 'microscopes'), I('sp-sci', 'Safety goggles', 'Equipment', 22, 24, 'pairs'), I('sp-sci', 'Beakers (250 ml)', 'Equipment', 30, 20, 'beakers'),
    I('sp-sci', 'Lab stools', 'Furniture', 24, 0, 'stools'), I('sp-sci', 'Lab manuals', 'Books', 26, 24, 'books'), I('sp-sci', 'Disinfecting wipes', 'Supplies', 2, 3, 'canisters', { icon: 'wipes' })];
  C('sp-sci', 20, 'Ms. Nguyen', b, [12, 26, 32, 24, 26, 4]);
  I('sp-pe', 'Basketballs', 'Equipment', 14, 10, 'balls'); I('sp-pe', 'Traffic cones', 'Equipment', 40, 0, 'cones'); I('sp-pe', 'Jump ropes', 'Equipment', 18, 20, 'ropes'); I('sp-pe', 'Gym mats', 'Furniture', 12, 0, 'mats');
  I('sp-art', 'Watercolor sets', 'Supplies', 20, 12, 'sets'); I('sp-art', 'Paint brushes', 'Supplies', 60, 40, 'brushes'); I('sp-art', 'Easels', 'Furniture', 10, 0, 'easels'); I('sp-art', 'Crayons', 'Supplies', 6, 8, 'boxes', { icon: 'crayons', loan: true, note: 'from the main closet' });
  const r6 = x.requests.find(r => r.id === 'r6'); if (r6) r6.placement = 'pending';
  x.notes.unshift({ id: 'n-sp1', to: 'admin', kind: 'low', text: 'Safety goggles in Science Lab are low (22 left, low at 24)', ts: ago(60) }, { id: 'n-sp2', to: 't1', kind: 'low', text: 'Dry-erase markers in Classroom · Rm 108 are low (3 left, low at 4)', ts: ago(60) });
}

// ---------- multi-school root ----------
// root = { session: { school, user } | null, lastCode, schools: { [id]: { id, name, code, logo, ...school data } } }
const ROOT = 'supplock-root-v2';
const demoSchool = d => { const x = { ...d }; delete x.session; return { ...x, id: 'sch1', name: 'Maplewood Elementary', code: 'MAPLE-4821', logo: '' }; };
let root = null;
try { root = JSON.parse(localStorage.getItem(ROOT)); } catch (e) {}
if (!root || !root.schools) {
  let old = null; try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  root = { session: null, lastCode: 'MAPLE-4821', schools: { sch1: demoSchool(old && old.items ? old : seed()) } };
}
Object.values(root.schools).forEach(x => addSpaces(x, x.id === 'sch1'));
const cur = () => root.schools[root.session && root.session.school] || root.schools[Object.keys(root.schools)[0]];
let db = cur();
const subs = new Set();
const save = () => { try { localStorage.setItem(ROOT, JSON.stringify(root)); } catch (e) { console.warn('Supplock: storage full', e); } db = cur(); subs.forEach(f => f()); };
window.addEventListener('storage', e => { if (e.key === ROOT && e.newValue) { root = JSON.parse(e.newValue); db = cur(); subs.forEach(f => f()); } });
export const subscribe = f => { subs.add(f); return () => subs.delete(f); };
export const get = () => db;
export const reset = () => { root = { session: null, lastCode: 'MAPLE-4821', schools: { sch1: demoSchool(seed()) } }; addSpaces(root.schools.sch1, true); save(); };

// ---------- schools ----------
const norm = c => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
const meta = x => x ? { id: x.id, name: x.name, code: x.code, logo: x.logo || '' } : null;
export const school = () => meta(db);
export const findSchool = code => meta(Object.values(root.schools).find(x => x.code === norm(code)));
export const lastSchool = () => findSchool(root.lastCode);
export const schoolUsers = code => { const x = Object.values(root.schools).find(y => y.code === norm(code)); return x ? x.users : []; };
const newCode = name => { const w = (String(name).replace(/[^A-Za-z]/g, '').toUpperCase() + 'SCHOOL').slice(0, 5); let c; do { c = w + '-' + (1000 + Math.floor(Math.random() * 9000)); } while (Object.values(root.schools).some(x => x.code === c)); return c; };
export function createSchool({ schoolName, adminName, email, logo }) {
  email = email.trim().toLowerCase();
  const sid = id('sch'); const code = newCode(schoolName);
  root.schools[sid] = { v: 1, id: sid, name: schoolName.trim(), code, logo: logo || '',
    users: [{ id: 'admin', name: adminName.trim(), role: 'admin', email }],
    items: [], laptops: [], requests: [], reorders: [], log: [], notes: [], spaces: [], spaceItems: [], counts: [],
    todos: [{ id: id('td'), text: 'Add your supplies to the inventory' }, { id: id('td'), text: 'Share the school code ' + code + ' with your teachers' }] };
  root.session = { school: sid, user: 'admin' }; root.lastCode = code; save(); return meta(root.schools[sid]);
}
export function signIn(code, email) {
  const x = Object.values(root.schools).find(y => y.code === norm(code)); if (!x) return { err: 'code' };
  const u = x.users.find(v => v.email === String(email).trim().toLowerCase()); if (!u) return { err: 'email' };
  root.session = { school: x.id, user: u.id }; root.lastCode = x.code; save(); return { user: u };
}
export function joinSchool(code, name, email, room) {
  const x = Object.values(root.schools).find(y => y.code === norm(code)); if (!x) return { err: 'code' };
  email = String(email).trim().toLowerCase(); if (x.users.some(v => v.email === email)) return { err: 'exists' };
  const u = { id: id('t'), name: name.trim(), role: 'teacher', room: (room || '').trim(), email }; x.users.push(u); (x.spaces = x.spaces || []).push({ id: 'sp-' + u.id, name: u.room ? 'Classroom · ' + u.room : u.name + "'s classroom", kind: 'classroom', subject: '', ownerId: u.id });
  root.session = { school: x.id, user: u.id }; root.lastCode = x.code; save(); return { user: u };
}
export function resizeLogo(file, max = 240) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('Please choose an image file.'));
    const r = new FileReader(); r.onerror = () => rej(new Error('Could not read that file.'));
    r.onload = () => { const img = new Image(); img.onerror = () => rej(new Error('Could not read that image.')); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/png'));
    }; img.src = r.result; };
    r.readAsDataURL(file);
  });
}
const blobCache = {};
export const logoSrc = d => {
  if (!d) return '';
  if (blobCache[d]) return blobCache[d];
  try { const [h, b] = d.split(','); const mime = (h.match(/data:([^;]+)/) || [])[1] || 'image/png'; const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return blobCache[d] = URL.createObjectURL(new Blob([a], { type: mime })); } catch (e) { return ''; }
};
export function setLogo(dataUrl) { db.logo = dataUrl || ''; save(); }
export function setSchoolName(n) { if (n.trim()) { db.name = n.trim(); save(); } }

// ---------- derived helpers ----------
export const user = uid => db.users.find(u => u.id === uid) || { name: '?' };
export const me = () => { const s = root.session; if (!s || s.school !== db.id) return null; return db.users.find(u => u.id === s.user) || null; };
export const firstTeacher = () => db.users.find(u => u.role === 'teacher') || null;
export const item = iid => db.items.find(i => i.id === iid);
export const level = it => it.qty === 0 ? 'out' : it.qty <= Math.floor(it.th / 3) ? 'critical' : it.qty < it.th ? 'low' : 'ok';
export const LEVEL = {
  ok: { label: 'In stock', fg: '#2f4f60', bg: '#dce8ee', bar: '#4d7b93' },
  low: { label: 'Low', fg: '#6e2c74', bg: '#f1dff3', bar: '#b45dbb' },
  critical: { label: 'Critical', fg: '#fff', bg: '#8c1c45', bar: '#8c1c45' },
  out: { label: 'Out of stock', fg: '#fff', bg: '#8c1c45', bar: '#8c1c45' }
};
export const plural = (pk, n) => n > 1 && !pk.includes('-') ? pk + (pk.endsWith('x') || pk.endsWith('s') ? 'es' : 's') : pk;
export const suggest = it => { const packs = Math.max(1, Math.ceil((it.th * 2 - it.qty) / it.pn)); return { packs, units: packs * it.pn, text: `Order ${packs} ${plural(it.pk, packs)} = ${packs * it.pn} ${it.unit}` }; };
export const lapCounts = () => { const c = { total: db.laptops.length, available: 0, out: 0, assigned: 0, zoom: 0 }; db.laptops.forEach(l => { c[l.status]++; if (l.zoom) c.zoom++; }); return c; };
export const reqTitle = r => r.kind === 'supply' ? item(r.itemId)?.name : r.kind === 'custom' ? r.name : r.type === 'full' ? 'Laptop · full-time class use' : 'Laptops · temporary checkout';
export const exceeds = r => r.status === 'pending' && (r.kind === 'supply' ? r.qty > item(r.itemId).qty : r.kind === 'laptop' ? r.qty > lapCounts().available : false);
export const available = r => r.kind === 'supply' ? item(r.itemId).qty : lapCounts().available;
export const STATUS = {
  pending: { label: 'Pending', fg: '#1a2c54', bg: '#dde2ee' },
  approved: { label: 'Approved', fg: '#fff', bg: '#4d7b93' },
  denied: { label: 'Denied', fg: '#fff', bg: '#5c4766' },
  ordered: { label: 'Ordered', fg: '#fff', bg: '#1a2c54' },
  delivered: { label: 'Delivered', fg: '#fff', bg: '#2f4f60' },
  returned: { label: 'Returned', fg: '#2e0f38', bg: '#e6dbef' }
};
export const statusOf = r => r.kind === 'custom' && r.status === 'approved' ? { label: 'Approved – Pending Order', fg: '#fff', bg: '#8351a8' } : r.kind === 'custom' && r.status === 'ordered' ? { ...STATUS.ordered, label: 'Ordered · arrives ' + fmtDate(r.eta) } : STATUS[r.status];

// ---------- mutations ----------
const log = (action, p) => db.log.unshift({ id: id('l'), ts: Date.now(), action, teacher: '', item: '', qty: '', result: '', room: '', ...p });
const notify = (to, kind, text) => db.notes.unshift({ id: id('n'), to, kind, text, ts: Date.now() });
const ensureTodo = (text, extra) => { if (!db.todos.some(t => !t.done && t.text === text)) db.todos.push({ id: id('td'), text, auto: true, ...extra }); };
const checkLow = it => { const lv = level(it); if (lv !== 'ok') { const s = suggest(it); notify('admin', 'low', `${it.name} ${lv === 'out' ? 'is out of stock' : 'is low'} (${it.qty} ${it.unit} left). Suggested: ${s.text.toLowerCase()}`); ensureTodo('Order more ' + it.name, { itemId: it.id }); } };
const unitStr = it => `${it.qty} ${it.unit}`;

export function login(uid) { root.session = { school: db.id, user: uid }; root.lastCode = db.code; save(); }
export function addTeacher(name, email, room) {
  email = email.trim().toLowerCase(); if (db.users.some(u => u.email === email)) return null;
  const u = { id: id('t'), name: name.trim(), role: 'teacher', room: room.trim(), email }; db.users.push(u); db.spaces.push({ id: 'sp-' + u.id, name: u.room ? 'Classroom · ' + u.room : u.name + "'s classroom", kind: 'classroom', subject: '', ownerId: u.id }); root.session = { school: db.id, user: u.id }; save(); return u;
}
export function logout() { root.session = null; save(); }
export function markRead(to) { db.notes.forEach(n => { if (n.to === to) n.read = true; }); save(); }

export function requestSupply(itemId, qty, room, note) {
  const u = me(), it = item(itemId);
  const r = { id: id('r'), kind: 'supply', teacherId: u.id, room, itemId, qty, note, status: 'pending', ts: Date.now() };
  db.requests.unshift(r);
  log('Requested', { teacher: u.name, item: it.name, qty, room, result: unitStr(it) + (qty > it.qty ? ' · exceeds stock' : '') });
  notify('admin', 'request', `New request from ${u.name}: ${qty} ${it.name}`);
  if (qty > it.qty) { notify('admin', 'urgent', `⚠️ Request from ${u.name} exceeds current stock for ${it.name}`); ensureTodo('Order more ' + it.name, { itemId }); }
  save(); return r;
}
export function requestCustom(f) {
  const u = me();
  const r = { id: id('c'), kind: 'custom', teacherId: u.id, status: 'pending', ts: Date.now(), ...f };
  db.requests.unshift(r);
  if (f.url) ensureTodo('Order ' + f.name, { link: f.url, due: f.needed, reqId: r.id });
  log('Requested', { teacher: u.name, item: 'Custom: ' + f.name, qty: f.qty, room: f.room });
  notify('admin', 'request', `New custom request from ${u.name}: ${f.name}`);
  save(); return r;
}
export function requestLaptop(f) {
  const u = me();
  const r = { id: id('r'), kind: 'laptop', teacherId: u.id, status: 'pending', ts: Date.now(), ...f, qty: f.type === 'full' ? 1 : f.qty };
  db.requests.unshift(r);
  log('Requested', { teacher: u.name, item: reqTitle(r), qty: r.qty, room: f.room });
  notify('admin', 'request', `New laptop request from ${u.name}`);
  if (r.qty > lapCounts().available) notify('admin', 'urgent', `⚠️ Request from ${u.name} exceeds current stock for Laptops`);
  save(); return r;
}
export function editQty(rid, qty) { const r = db.requests.find(x => x.id === rid); if (r) { r.qty = Math.max(1, qty); save(); } }
export function approve(rid) {
  const r = db.requests.find(x => x.id === rid); if (!r || r.status !== 'pending') return;
  const t = user(r.teacherId);
  if (r.kind === 'supply') {
    const it = item(r.itemId); const taken = Math.min(r.qty, it.qty); it.qty = Math.max(0, it.qty - r.qty);
    r.status = 'approved';
    log('Approved', { teacher: t.name, item: it.name, qty: r.qty, room: r.room, result: 'by ' + user('admin').name });
    log('Deducted', { teacher: t.name, item: it.name, qty: -taken, room: r.room, result: unitStr(it) + (it.qty === 0 ? ' · out of stock' : '') });
    checkLow(it);
    notify(r.teacherId, 'status', `Your request for ${r.qty} ${it.name} was approved`); r.placement = 'pending';
  } else if (r.kind === 'custom') {
    r.status = 'approved';
    log('Approved', { teacher: t.name, item: 'Custom: ' + r.name, qty: r.qty, room: r.room, result: 'pending order' });
    if (!r.url) ensureTodo('Order ' + r.name, { due: r.needed, reqId: r.id });
    notify(r.teacherId, 'status', `Your request for ${r.name} was approved and is pending order`);
  } else {
    const free = db.laptops.filter(l => l.status === 'available').slice(0, r.qty);
    free.forEach(l => Object.assign(l, r.type === 'full' ? { status: 'assigned', holder: r.teacherId, room: r.room } : { status: 'out', holder: r.teacherId, room: r.room, until: r.to }));
    r.tags = free.map(l => l.tag); r.status = 'approved';
    log(r.type === 'full' ? 'Laptop assigned' : 'Laptop checkout', { teacher: t.name, item: r.tags.join(', ') || 'none available', qty: free.length, room: r.room, result: lapCounts().available + ' available' });
    notify(r.teacherId, 'status', `Your laptop request was approved: ${r.tags.join(', ')}`); if (r.tags.length) r.placement = 'pending';
  }
  save();
}
export function deny(rid) {
  const r = db.requests.find(x => x.id === rid); if (!r) return;
  r.status = 'denied'; const t = user(r.teacherId);
  log('Denied', { teacher: t.name, item: reqTitle(r), qty: r.qty, room: r.room, result: 'inventory unchanged' });
  db.todos.forEach(td => { if (td.reqId === rid) td.done = true; });
  notify(r.teacherId, 'status', `Your request for ${reqTitle(r)} was denied`);
  save();
}
export function customOrdered(rid, eta) {
  const r = db.requests.find(x => x.id === rid); r.status = 'ordered'; r.eta = eta;
  db.todos.forEach(td => { if (td.reqId === rid) td.done = true; });
  log('Reorder placed', { teacher: user(r.teacherId).name, item: 'Custom: ' + r.name, qty: r.qty, result: 'arrives ' + fmtDate(eta) });
  notify(r.teacherId, 'status', `Your request for ${r.name} has been ordered — expected to arrive ${fmtDate(eta)}.`);
  save();
}
export function customDelivered(rid) {
  const r = db.requests.find(x => x.id === rid); r.status = 'delivered';
  log('Received', { teacher: user(r.teacherId).name, item: 'Custom: ' + r.name, qty: r.qty, result: 'ready for pickup' });
  notify(r.teacherId, 'status', `Your ${r.name} has arrived and is ready for pickup at the front office.`); r.placement = 'pending';
  save();
}
export function placeReorder(itemId, packs, days = 5) {
  const it = item(itemId); const o = { id: id('o'), itemId, packs, placed: isoPlus(0), eta: isoPlus(days), status: 'ordered' };
  db.reorders.unshift(o);
  log('Reorder placed', { item: it.name, qty: `${packs} ${plural(it.pk, packs)}`, result: 'arrives ' + fmtDate(o.eta) });
  save(); return o;
}
export function setReorderPacks(oid, packs) { const o = db.reorders.find(x => x.id === oid); o.packs = Math.max(1, packs); save(); }
export function receiveReorder(oid, packs) {
  const o = db.reorders.find(x => x.id === oid); const it = item(o.itemId); const n = packs ?? o.packs; const add = n * it.pn;
  it.qty += add; o.status = 'received'; o.received = n; o.receivedOn = isoPlus(0);
  log('Received', { item: it.name, qty: add, result: `${n} ${plural(it.pk, n)} × ${it.pn} → ${unitStr(it)}` });
  if (level(it) === 'ok') db.todos.forEach(td => { if (td.itemId === it.id) td.done = true; });
  save();
}
export function saveItem(f) {
  if (f.id && item(f.id)) {
    const it = item(f.id); const before = it.qty; Object.assign(it, f);
    if (before !== it.qty) { log('Adjustment', { item: it.name, qty: it.qty - before, result: unitStr(it) }); checkLow(it); }
  } else {
    const it = { ...f, id: id('i') }; db.items.push(it);
    log('Item added', { item: it.name, qty: it.qty, result: unitStr(it) }); checkLow(it);
  }
  save();
}
export function removeItem(iid) { const it = item(iid); db.items = db.items.filter(i => i.id !== iid); log('Item removed', { item: it.name }); save(); }
export function adjust(iid, delta) { const it = item(iid); it.qty = Math.max(0, it.qty + delta); log('Adjustment', { item: it.name, qty: delta, result: unitStr(it) }); checkLow(it); save(); }
export function returnLaptop(tag) {
  const l = db.laptops.find(x => x.tag === tag); const t = l.holder ? user(l.holder).name : '';
  const room = l.room; Object.assign(l, { status: 'available', holder: null, room: '', until: '' });
  log('Laptop return', { teacher: t, item: tag, qty: 1, room, result: lapCounts().available + ' available' });
  save();
}
export function toggleZoom(tag) { const l = db.laptops.find(x => x.tag === tag); l.zoom = !l.zoom; save(); }
export function addLaptop() { const n = db.laptops.length + 1; db.laptops.push({ tag: 'LT-' + String(n).padStart(3, '0'), status: 'available', zoom: false, holder: null, room: '', until: '' }); log('Adjustment', { item: 'Laptop LT-' + String(n).padStart(3, '0') + ' added', qty: 1 }); save(); }
export function addTodo(text) { if (text.trim()) { db.todos.push({ id: id('td'), text: text.trim() }); save(); } }
export function toggleTodo(tid) { const t = db.todos.find(x => x.id === tid); t.done = !t.done; save(); }
export function editTodo(tid, text) { const t = db.todos.find(x => x.id === tid); if (text.trim()) t.text = text.trim(); save(); }
export function deleteTodo(tid) { db.todos = db.todos.filter(x => x.id !== tid); save(); }

// ---------- spaces: classroom & subject inventories ----------
export const SPACE_CATS = ['Supplies', 'Equipment', 'Books', 'Furniture'];
export const allSpaces = () => db.spaces || [];
export const spacesOf = uid => allSpaces().filter(x => x.ownerId === uid);
export const space = sid => allSpaces().find(x => x.id === sid);
export const spaceItems = sid => (db.spaceItems || []).filter(i => i.spaceId === sid);
export const spaceCounts = sid => (db.counts || []).filter(c => c.spaceId === sid).sort((a, b) => b.ts - a.ts);
export const spaceLevel = it => !it.th ? 'ok' : it.qty === 0 ? 'out' : it.qty < it.th ? 'low' : 'ok';
const actor = () => (me() || { name: '?' }).name;
const spaceLow = it => {
  if (!it || !it.th || it.qty >= it.th) return; const sp = space(it.spaceId); if (!sp) return;
  const msg = `${it.name} in ${sp.name} ${it.qty === 0 ? 'ran out' : 'is low'} (${it.qty} left, low at ${it.th})`;
  [sp.ownerId, 'admin'].forEach(to => { if (!db.notes.some(n => n.to === to && n.text === msg && !n.read)) notify(to, 'low', msg); });
};
export function createSpace({ name, kind, subject, ownerId }) {
  const sp = { id: id('sp'), name: name.trim(), kind: kind || 'subject', subject: (subject || '').trim(), ownerId }; db.spaces.push(sp);
  log('Space created', { teacher: user(ownerId).name, item: sp.name, room: sp.name, result: 'owner ' + user(ownerId).name });
  notify(ownerId, 'status', `You've been assigned ${sp.name}. Take its inventory under My spaces.`); save(); return sp;
}
export function updateSpace(sid, patch) {
  const sp = space(sid); const was = sp.ownerId; Object.assign(sp, patch);
  if (patch.ownerId && patch.ownerId !== was) { log('Space created', { teacher: user(sp.ownerId).name, item: sp.name, room: sp.name, result: 'reassigned from ' + user(was).name }); notify(sp.ownerId, 'status', `You've been assigned ${sp.name}.`); }
  save();
}
export function deleteSpace(sid) { const sp = space(sid); db.spaces = db.spaces.filter(x => x.id !== sid); db.spaceItems = db.spaceItems.filter(i => i.spaceId !== sid); db.counts = db.counts.filter(c => c.spaceId !== sid); log('Space created', { item: sp.name, room: sp.name, result: 'space removed' }); save(); }
export function saveSpaceItem(f) {
  const sp = space(f.spaceId); const q = Math.max(0, Math.round(Number(f.qty) || 0)); const th = Math.max(0, Math.round(Number(f.th) || 0));
  const ex = f.id && db.spaceItems.find(i => i.id === f.id);
  if (ex) { const before = ex.qty; Object.assign(ex, { name: f.name.trim(), cat: f.cat, unit: (f.unit || '').trim(), qty: q, th, loan: !!f.loan, note: (f.note || '').trim() });
    if (before !== q) log('Space adjustment', { teacher: actor(), item: ex.name, qty: q - before, room: sp.name, result: q + ' ' + ex.unit }); spaceLow(ex); }
  else { const it = { id: id('si'), spaceId: f.spaceId, name: f.name.trim(), cat: f.cat || 'Supplies', unit: (f.unit || '').trim(), qty: q, th, loan: !!f.loan, note: (f.note || '').trim(), icon: f.icon || '' };
    db.spaceItems.push(it); log('Space item', { teacher: actor(), item: it.name, qty: q, room: sp.name, result: 'added' + (it.loan ? ' · on loan' : '') }); spaceLow(it); }
  save();
}
export function adjustSpaceItem(iid, d) { const it = db.spaceItems.find(i => i.id === iid); const before = it.qty; it.qty = Math.max(0, it.qty + d); if (it.qty !== before) { log('Space adjustment', { teacher: actor(), item: it.name, qty: it.qty - before, room: space(it.spaceId).name, result: it.qty + ' ' + it.unit }); spaceLow(it); save(); } }
export function removeSpaceItem(iid) { const it = db.spaceItems.find(i => i.id === iid); db.spaceItems = db.spaceItems.filter(i => i.id !== iid); log('Space item', { teacher: actor(), item: it.name, room: space(it.spaceId).name, result: 'removed' }); save(); }
export function saveCount(sid, lines) {
  const sp = space(sid); const prev = spaceCounts(sid)[0];
  const out = lines.map(l => { const it = db.spaceItems.find(i => i.id === l.id); const pl = prev && prev.lines.find(x => x.id === l.id);
    const r = { id: l.id, name: it.name, unit: it.unit, expected: it.qty, counted: Math.max(0, Math.round(Number(l.counted) || 0)), prev: pl ? pl.counted : null }; it.qty = r.counted; return r; });
  db.counts.push({ id: id('ct'), spaceId: sid, ts: Date.now(), by: actor(), lines: out });
  const fixed = out.filter(l => l.counted !== l.expected).length;
  log('Space count', { teacher: actor(), item: sp.name, qty: out.length + ' items', room: sp.name, result: fixed ? fixed + ' corrected' : 'all matched' });
  out.forEach(l => spaceLow(db.spaceItems.find(i => i.id === l.id))); save();
}
export const pendingPlacements = uid => db.requests.filter(r => r.teacherId === uid && r.placement === 'pending');
export function place(rid, sid, loan) {
  const r = db.requests.find(x => x.id === rid); if (!r) return;
  if (!sid) { r.placement = 'skipped'; save(); return; }
  const sp = space(sid); const it = r.kind === 'supply' ? item(r.itemId) : null;
  const name = r.kind === 'supply' ? (it ? it.name : 'Item') : r.kind === 'custom' ? r.name : 'Laptops ' + (r.tags || []).join(', ');
  const qty = r.kind === 'laptop' ? (r.tags || []).length : r.qty;
  const same = db.spaceItems.find(i => i.spaceId === sid && i.name === name && !!i.loan === !!loan);
  if (same) same.qty += qty;
  else db.spaceItems.push({ id: id('si'), spaceId: sid, name, cat: r.kind === 'laptop' ? 'Equipment' : 'Supplies', unit: it ? it.unit : r.kind === 'laptop' ? 'laptops' : 'units', qty, th: 0, loan: !!loan,
    note: r.kind === 'laptop' && r.to ? 'due back ' + fmtDate(r.to) : '', icon: it ? (it.icon || '') : r.kind === 'laptop' ? 'laptop' : '' });
  r.placement = 'done'; r.placedIn = sid;
  log('Placed in space', { teacher: user(r.teacherId).name, item: name, qty, room: sp.name, result: loan ? 'on loan from main closet' : 'added to space' }); save();
}

// ---------- Excel export ----------
let xlsxP = null;
const loadXlsx = () => xlsxP = xlsxP || new Promise((res, rej) => {
  if (window.XLSX) return res(window.XLSX);
  const el = document.createElement('script'); el.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  el.onload = () => res(window.XLSX); el.onerror = () => { xlsxP = null; rej(new Error('Could not load the Excel exporter. Check your internet connection.')); };
  document.head.appendChild(el);
});
export async function exportXlsx(filename, sheets) {
  const X = await loadXlsx(); const wb = X.utils.book_new(); const used = new Set();
  sheets.forEach(sh => {
    const rows = sh.rows.length ? sh.rows : [{ Note: 'Nothing here yet' }]; const ws = X.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(10, Math.min(48, Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)) + 2)) }));
    let nm = (sh.name || 'Sheet').replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet'; let k = 2; while (used.has(nm)) nm = nm.slice(0, 28) + ' ' + k++; used.add(nm);
    X.utils.book_append_sheet(wb, ws, nm);
  });
  X.writeFile(wb, filename);
}
const fileSafe = x => String(x || '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
export const exportName = what => `${fileSafe(db.name || 'Supplock')}-${fileSafe(what)}-${isoPlus(0)}.xlsx`;
const lvlText = it => ({ ok: 'OK', low: 'Low', out: 'Out' })[spaceLevel(it)];
export const spaceRows = sid => spaceItems(sid).map(i => ({ Item: i.name, Category: i.cat, Quantity: i.qty, Unit: i.unit, 'Low alert at': i.th || '', Status: lvlText(i), 'On loan from main closet': i.loan ? 'Yes' : 'No', Note: i.note || '' }));
export const countRows = sid => spaceCounts(sid).flatMap(c => c.lines.map(l => ({ Date: new Date(c.ts).toLocaleDateString(), 'Counted by': c.by, Item: l.name, 'On record': l.expected, Counted: l.counted, Difference: l.counted - l.expected, 'Previous count': l.prev ?? '' })));
export const allSpaceRows = () => allSpaces().flatMap(sp => spaceItems(sp.id).map(i => ({ Space: sp.name, Type: sp.kind === 'classroom' ? 'Classroom' : (sp.subject || 'Subject'), Owner: user(sp.ownerId).name, ...spaceRows(sp.id).find(r => r.Item === i.name) })));
export const spaceSummaryRows = () => allSpaces().map(sp => { const it = spaceItems(sp.id); const lc = spaceCounts(sp.id)[0]; return { Space: sp.name, Type: sp.kind === 'classroom' ? 'Classroom' : (sp.subject || 'Subject'), Owner: user(sp.ownerId).name, Items: it.length, 'Total units': it.reduce((a, b) => a + b.qty, 0), Low: it.filter(i => spaceLevel(i) !== 'ok').length, 'On loan': it.filter(i => i.loan).length, 'Last counted': lc ? new Date(lc.ts).toLocaleDateString() : 'Never' }; });
export const closetRows = () => db.items.map(i => ({ Item: i.name, Category: i.cat, Quantity: i.qty, Unit: i.unit, 'Low-stock threshold': i.th, Status: LEVEL[level(i)].label, Pack: '1 ' + i.pk + ' = ' + i.pn + ' ' + i.unit, Vendor: i.vendor, 'Price per unit': Number(i.price || 0), 'Stock value': +(i.qty * (i.price || 0)).toFixed(2), Link: i.url }));
export const orderRows = () => db.reorders.map(o => { const i = item(o.itemId) || { name: '(removed)', pk: '', pn: 1, unit: '' }; return { Item: i.name, Packs: o.packs, Units: o.packs * i.pn + ' ' + i.unit, Placed: o.placed, 'Expected arrival': o.eta, Status: o.status === 'received' ? 'Received' : 'On order', 'Received on': o.receivedOn || '' }; });

if (typeof window !== 'undefined') window.SupplockStore = { get, subscribe, reset };

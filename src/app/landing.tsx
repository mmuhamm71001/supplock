'use client';
import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@/components/icon';

// The public landing page: a dashboard mockup surrounded by small widgets visitors can play with.
// Nothing here touches real data. On laptops the playground shrinks to fit; on tablets and phones the floating widgets are hidden (see .landing-* in globals.css).

const STAR = '15,1 18.5,11.5 29,15 18.5,18.5 15,29 11.5,18.5 1,15 11.5,11.5';
const Star = ({ size, fill, style }: { size: number; fill: string; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" style={style}><polygon points={STAR} fill={fill} /></svg>
);
const Dot = ({ c }: { c: string }) => <i style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'block' }} />;
const card = (bg: string, edge: string, rot: number, extra?: CSSProperties): CSSProperties => ({
  transform: `rotate(${rot}deg)`, background: bg, borderRadius: 30, boxShadow: `0 8px 0 ${edge},0 18px 30px rgba(46,15,56,.22),0 4px 8px rgba(46,15,56,.12)`, ...extra
});

// Floating wrapper: drifts gently; straightens and lifts on hover (CSS in globals).
function Float({ i, at, z = 3, children }: { i: number; at: CSSProperties; z?: number; children: ReactNode }) {
  return <div data-float={i} className="landing-float" style={{ position: 'absolute', zIndex: z, ...at }}>{children}</div>;
}

export function Landing() {
  const [qty, setQty] = useState(3);
  const [sent, setSent] = useState(false);
  const [stock, setStock] = useState(62);
  const [decision, setDecision] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [zoom, setZoom] = useState(true);
  const [neededBy, setNeededBy] = useState('2026-10-24');
  const [classroom, setClassroom] = useState('Rm 204');
  const [todos, setTodos] = useState([
    { text: 'Order more dry-erase markers', done: false, icon: 'markers' },
    { text: "Call Sam's Club about bulk pricing", done: false, icon: '' },
    { text: 'Order 1 box = 10 reams', done: true, icon: 'paper' }
  ]);

  // Gentle bobbing, skipped for people who prefer less motion.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      document.querySelectorAll<HTMLElement>('[data-float]').forEach(el => {
        const i = Number(el.dataset.float);
        el.style.translate = `0 ${Math.sin((t - t0) / (1600 + i * 170) + i * 1.3) * 7}px`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => { if (!sent) return; const t = setTimeout(() => setSent(false), 2400); return () => clearTimeout(t); }, [sent]);

  // The playground is laid out for a 1440px-wide window. On smaller laptop screens, shrink it to fit.
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const size = () => setFit(Math.min(1, window.innerWidth / 1440));
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, []);

  const lvl = stock < 10 ? 'crit' : stock < 30 ? 'low' : 'ok';
  const col = { ok: '#4d7b93', low: '#b45dbb', crit: '#9b1d4a' } as const;
  const tcol = { ok: '#335a6e', low: '#8a3f90', crit: '#9b1d4a' } as const;
  const bars: [string, number, keyof typeof col][] = [['Paper', 82, 'ok'], ['Cleaning', stock, lvl], ['Art', 61, 'ok'], ['Writing', 8, 'crit'], ['Classroom', 74, 'ok'], ['Tech', 27, 'low']];
  const row1 = decision === 'approved' ? ['Approved', '#4d7b93'] : decision === 'denied' ? ['Denied', '#5c4766'] : ['Exceeds stock', '#9b1d4a'];
  const hand = (size: number, color: string, extra?: CSSProperties): CSSProperties => ({ fontFamily: 'var(--font-hand)', fontSize: size, fontWeight: 700, color, pointerEvents: 'none', ...extra });
  const ctaBig: CSSProperties = { fontWeight: 700, fontSize: 17, padding: '17px 28px', borderRadius: 18, textDecoration: 'none', display: 'inline-block' };

  return (
    <div className="landing" style={{ overflow: 'hidden', backgroundColor: '#f6f1f8', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .18 0 0 0 0 .06 0 0 0 0 .22 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}>
      <header className="landing-header" style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#2e0f38', textDecoration: 'none' }}>
          <Star size={30} fill="#8351a8" /><span style={{ fontFamily: 'var(--font-serif)', fontSize: 26, letterSpacing: '-0.01em' }}>Supplock</span>
        </Link>
        <nav aria-label="Main" className="landing-nav" style={{ display: 'flex', alignItems: 'center', gap: 34, fontSize: 16, fontWeight: 500 }}>
          <a href="#how" style={{ color: '#2e0f38', textDecoration: 'none' }}>How it works</a>
          <Link href="/login?mode=join" style={{ color: '#2e0f38', textDecoration: 'none' }}>For teachers</Link>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" style={{ color: '#2e0f38', fontWeight: 500, padding: '12px 18px', textDecoration: 'none' }}>Log in</Link>
          <Link href="/login?mode=create" style={{ background: '#2e0f38', color: '#f6f1f8', fontWeight: 700, padding: '12px 22px', borderRadius: 999, boxShadow: '0 4px 0 #1a0621', textDecoration: 'none' }}>Get started</Link>
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="landing-hero" style={{ maxWidth: 1320, margin: '0 auto', padding: '56px 40px 0', position: 'relative' }}>
          <div className="landing-hero-text" style={{ marginLeft: '16.66%', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: '#2e0f38', color: '#f6f1f8', padding: '7px 12px', borderRadius: 8, transform: 'rotate(-2deg)' }}>School supply desk</span>
              <span style={{ fontFamily: 'var(--font-hand)', fontSize: 24, color: '#8351a8' }}>for the supply closet that never adds up</span>
            </div>
            <h1 className="landing-h1" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 92, lineHeight: 0.98, letterSpacing: '-0.025em', margin: 0, maxWidth: 960, textWrap: 'balance' }}>
              Every marker, crayon and laptop —{' '}
              <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
                <span aria-hidden="true" style={{ position: 'absolute', left: -6, right: -10, bottom: 6, height: 26, background: '#e7c4ea', borderRadius: '40px 10px 30px 12px / 14px 30px 10px 26px', transform: 'rotate(-1.2deg)' }} />
                <span style={{ position: 'relative' }}>accounted for.</span>
              </span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px 48px', marginTop: 34, flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 470 }}>
                <p style={{ fontFamily: 'var(--font-hand)', fontSize: 38, fontWeight: 700, color: '#8351a8', margin: '0 0 8px', transform: 'rotate(-1.5deg)', transformOrigin: 'left' }}>Supplies, locked in.</p>
                <p style={{ fontSize: 19, lineHeight: 1.55, margin: 0, color: '#3d2547', textWrap: 'pretty' }}>Teachers request what they need in two clicks. You approve, stock updates itself, and anything running low lands on your reorder list before it runs out.</p>
              </div>
              <div style={{ display: 'flex', gap: 14, paddingBottom: 4, flexWrap: 'wrap' }}>
                <Link href="/login?mode=create" className="landing-lift" style={{ ...ctaBig, background: '#8351a8', color: '#fff', boxShadow: '0 6px 0 #5e3680,0 14px 26px rgba(46,15,56,.18)' }}>Start tracking supplies</Link>
                <Link href="/login?mode=join" className="landing-lift" style={{ ...ctaBig, background: '#fff', color: '#2e0f38', border: '2px solid #2e0f38', boxShadow: '0 6px 0 #2e0f38' }}>I&apos;m a teacher</Link>
              </div>
            </div>
          </div>
          <Star size={70} fill="#b45dbb" style={{ position: 'absolute', left: 96, top: 70, transform: 'rotate(14deg)' }} />
          <Star size={28} fill="#4d7b93" style={{ position: 'absolute', left: 170, top: 168 }} />
          <svg width="90" height="24" viewBox="0 0 90 24" aria-hidden="true" style={{ position: 'absolute', right: 60, top: 40 }}><path d="M2 12 C12 2, 20 22, 30 12 S48 2, 58 12 S76 22, 88 12" fill="none" stroke="#4d7b93" strokeWidth="3" strokeLinecap="round" /></svg>
        </section>

        {/* dashboard mockup + playground */}
        <section aria-label="What Supplock looks like" className="landing-stage" style={{ position: 'relative', maxWidth: 1440, height: 900, margin: '120px auto 0', zoom: fit < 1 ? fit : undefined }}>
          <div className="landing-mock" style={{ position: 'absolute', left: '50%', top: 70, width: 920, marginLeft: -460, background: '#fff', borderRadius: 34, boxShadow: '0 10px 0 #ddd0e4,0 40px 80px rgba(46,15,56,.16)', overflow: 'hidden', border: '2px solid #2e0f38' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#1a2c54', color: '#f6f1f8', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Star size={18} fill="#d9b3dd" /><span style={{ fontFamily: 'var(--font-serif)', fontSize: 17 }}>Supplock</span></div>
              <div className="landing-mock-nav" style={{ display: 'flex', gap: 6, fontSize: 13, fontWeight: 500 }}>
                <span style={{ background: '#f6f1f8', color: '#1a2c54', padding: '6px 12px', borderRadius: 999 }}>Dashboard</span>
                {['Inventory', 'Requests', 'Laptops', 'Gazette', 'Log'].map(n => <span key={n} style={{ padding: '6px 12px', opacity: 0.85 }}>{n}</span>)}
              </div>
              <div aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', background: '#b45dbb', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>JR</div>
            </div>
            <div className="landing-mock-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 18, padding: 22, background: '#f6f1f8' }}>
              <div style={{ background: '#fff', borderRadius: 22, padding: '20px 22px', border: '1px solid #e6dbef' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20 }}>Stock by category</h3>
                  <span style={{ fontSize: 12, color: '#5c4766' }}>142 items</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {bars.map(([name, p, l]) => (
                    <div key={name} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 46px', alignItems: 'center', gap: 12, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{name}</span>
                      <div style={{ height: 14, borderRadius: 999, background: '#efe7f3', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 999, width: p + '%', background: col[l], transition: 'width .25s' }} /></div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right', color: tcol[l], fontWeight: 700 }}>{p}%</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 18, fontSize: 12, color: '#4a3654' }}>
                  {([['OK', '#4d7b93'], ['Low', '#b45dbb'], ['Critical', '#9b1d4a']] as const).map(([n, c]) => <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Dot c={c} />{n}</span>)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: '#fff', borderRadius: 22, padding: '18px 22px', border: '1px solid #e6dbef', display: 'flex', alignItems: 'center', gap: 22 }}>
                  <svg width="112" height="112" viewBox="0 0 42 42" aria-hidden="true" style={{ transform: 'rotate(-90deg)', flex: 'none' }}>
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#efe7f3" strokeWidth="6" />
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#4d7b93" strokeWidth="6" strokeDasharray="60 40" strokeDashoffset="0" />
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#8351a8" strokeWidth="6" strokeDasharray="27 73" strokeDashoffset="-60" />
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#1a2c54" strokeWidth="6" strokeDasharray="13 87" strokeDashoffset="-87" />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 10px', fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20 }}>Laptops</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', fontSize: 13 }}>
                      {([['Available', '#4d7b93', 18], ['Checked out', '#8351a8', 8], ['In classrooms', '#1a2c54', 4]] as const).map(([n, c, v]) => (
                        <span key={n} style={{ display: 'contents' }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Dot c={c} />{n}</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span></span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 22, padding: '18px 22px', border: '1px solid #e6dbef' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20 }}>Pending requests</h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: '#f1dff3', color: '#6e2c74', padding: '3px 9px', borderRadius: 999, fontWeight: 700 }}>{decision === 'pending' ? 3 : 2}</span>
                  </div>
                  {([['Dry-erase markers × 12', 'Ms. Alvarez · Rm 108', row1[0], '#fff', row1[1]], ['Laptops × 6', 'Mr. Chen · Oct 14–16 · testing', 'Pending', '#1a2c54', '#dde2ee'], ['Wobble cushions × 2', 'Ms. Patel · Rm 204', 'Custom', '#6e2c74', '#f1dff3']] as const).map(([t, sub, label, fg, bg], i) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: i < 2 ? '1px solid #efe7f3' : 'none' }}>
                      <div><div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div><div style={{ fontSize: 12, color: '#5c4766' }}>{sub}</div></div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: fg, background: bg, padding: '4px 9px', borderRadius: 8, whiteSpace: 'nowrap' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* floating widgets (desktop only) */}
          <div className="landing-widgets">
            <Float i={0} at={{ left: 'calc(50% - 690px)', top: 40 }}>
              <div className="landing-card" style={card('#8351a8', '#5e3680', -8, { color: '#fff', padding: 20, width: 250 })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f6f1f8', display: 'grid', placeItems: 'center' }}><Icon name="tissues" size={46} /></div>
                  <div><div style={{ fontWeight: 700, fontSize: 16 }}>Tissues</div><div style={{ fontSize: 13, color: '#eadcf3' }}>In stock</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#6c3f91', borderRadius: 16, padding: 6, marginBottom: 10 }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease" style={{ width: 44, height: 44, border: 'none', borderRadius: 12, background: '#fff', color: '#2e0f38', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>−</button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(99, q + 1))} aria-label="Increase" style={{ width: 44, height: 44, border: 'none', borderRadius: 12, background: '#fff', color: '#2e0f38', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>+</button>
                </div>
                <button onClick={() => setSent(true)} style={{ width: '100%', height: 52, border: 'none', borderRadius: 16, background: '#2e0f38', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 0 #1a0621' }}>{sent ? 'Sent ✓' : 'Request'}</button>
              </div>
            </Float>

            <Float i={1} at={{ left: 'calc(50% - 720px)', top: 430 }}>
              <div className="landing-card" style={card('#4d7b93', '#335a6e', 6, { color: '#fff', padding: '20px 22px', width: 260 })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}><span style={{ background: '#f6f1f8', borderRadius: 12, padding: 3, display: 'flex' }}><Icon name="tissues" size={40} /></span>Tissues</span>
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#fff', color: tcol[lvl], padding: '3px 9px', borderRadius: 999 }}>{lvl === 'ok' ? 'OK' : lvl === 'low' ? 'Low' : stock === 0 ? 'Out of stock' : 'Critical'}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 700, marginBottom: 6 }}>{stock}<span style={{ fontSize: 14, fontWeight: 500 }}> boxes</span></div>
                <input type="range" min={0} max={100} value={stock} onChange={e => setStock(Number(e.target.value))} aria-label="Tissue stock" style={{ width: '100%', height: 28, margin: 0, accentColor: '#2e0f38' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#e6f0f4' }}><span>0</span><span>low at 30</span><span>100</span></div>
              </div>
            </Float>

            <Float i={2} at={{ left: 'calc(50% + 430px)', top: 10 }}>
              <div className="landing-card" style={card('#b45dbb', '#8a3f90', 7, { color: '#fff', padding: 18, width: 250 })}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Ms. Alvarez · markers × 12</div>
                <div style={{ fontSize: 12, fontWeight: 700, background: '#2e0f38', padding: '4px 8px', borderRadius: 8, display: 'inline-block', marginBottom: 12 }}>Exceeds stock (4 available)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#8f4396', borderRadius: 18, padding: 5, gap: 5 }}>
                  <button aria-pressed={decision === 'approved'} onClick={() => setDecision(d => (d === 'approved' ? 'pending' : 'approved'))} style={{ height: 48, border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', background: decision === 'approved' ? '#fff' : 'transparent', color: decision === 'approved' ? '#2e0f38' : '#fff' }}>Approve</button>
                  <button aria-pressed={decision === 'denied'} onClick={() => setDecision(d => (d === 'denied' ? 'pending' : 'denied'))} style={{ height: 48, border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', background: decision === 'denied' ? '#2e0f38' : 'transparent', color: '#fff' }}>Deny</button>
                </div>
              </div>
            </Float>

            <Float i={3} at={{ left: 'calc(50% + 460px)', top: 300 }}>
              <div className="landing-card" style={card('#1a2c54', '#0f1b37', -6, { color: '#f6f1f8', padding: '20px 22px', width: 240 })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ background: '#f6f1f8', borderRadius: 14, padding: 3, display: 'flex' }}><Icon name="laptop-zoom" size={40} /></span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, letterSpacing: '0.02em' }}>LT-001</span>
                </div>
                <div style={{ fontSize: 13, color: '#c9d1e3', marginBottom: 12 }}>Assigned · Rm 204 · Ms. Patel</div>
                <button onClick={() => setZoom(z => !z)} role="switch" aria-checked={zoom} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#2a3e6a', border: 'none', borderRadius: 16, padding: '10px 12px', color: '#f6f1f8', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                  <span>Zoom installed</span>
                  <span style={{ position: 'relative', width: 52, height: 30, borderRadius: 999, background: zoom ? '#b45dbb' : '#5a6a8c', transition: 'background .2s', display: 'block' }}><span style={{ position: 'absolute', top: 3, left: zoom ? 25 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s', display: 'block' }} /></span>
                </button>
              </div>
            </Float>

            <Float i={4} at={{ left: 'calc(50% - 600px)', top: 690 }}>
              <div className="landing-card" style={{ ...card('#fffdfb', '#2e0f38', -4, { color: '#2e0f38', padding: '18px 20px', width: 290, border: '2px solid #2e0f38' }), boxShadow: '0 8px 0 #2e0f38,0 18px 30px rgba(46,15,56,.2)' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, marginBottom: 8 }}>To-do</div>
                {todos.map((t, i) => (
                  <button key={t.text} aria-pressed={t.done} onClick={() => setTodos(ts => ts.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: '#2e0f38' }}>
                    <span style={{ flex: 'none', width: 24, height: 24, border: '2.5px solid #2e0f38', borderRadius: '7px 5px 8px 4px', display: 'grid', placeItems: 'center', background: t.done ? '#8351a8' : '#fff', color: '#fff', fontSize: 15, fontWeight: 700 }}>{t.done ? '✓' : ''}</span>
                    {t.icon && <Icon name={t.icon} size={40} />}
                    <span style={{ fontSize: 14, fontWeight: 500, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>{t.text}</span>
                  </button>
                ))}
              </div>
            </Float>

            <Float i={5} at={{ left: 'calc(50% + 330px)', top: 700 }}>
              <div className="landing-card" style={{ ...card('#dce8ee', '#9ebccb', 9, { color: '#1a2c54', padding: '18px 20px', width: 240 }), boxShadow: '0 8px 0 #9ebccb,0 18px 30px rgba(46,15,56,.18)' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Needed by
                  <input type="date" value={neededBy} onChange={e => setNeededBy(e.target.value)} style={{ display: 'block', marginTop: 8, width: '100%', height: 48, border: '2px solid #1a2c54', borderRadius: 14, padding: '0 12px', fontFamily: 'var(--font-mono)', fontSize: 15, color: '#1a2c54', background: '#fff' }} />
                </label>
              </div>
            </Float>

            <Float i={6} at={{ left: 'calc(50% + 505px)', top: 560 }} z={2}>
              <div className="landing-card" style={{ ...card('#e6dbef', '#c2abd4', -10, { color: '#2e0f38', padding: '18px 20px', width: 200 }), boxShadow: '0 8px 0 #c2abd4,0 18px 30px rgba(46,15,56,.18)' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Classroom
                  <input value={classroom} onChange={e => setClassroom(e.target.value)} style={{ display: 'block', marginTop: 8, width: '100%', height: 48, border: '2px solid #8351a8', borderRadius: 14, padding: '0 12px', fontSize: 16, color: '#2e0f38', background: '#fff' }} />
                </label>
              </div>
            </Float>

            {([[7, 'calc(50% - 600px)', 620, 78, 78, 24, '#b45dbb', '#8a3f90', -12, 7], [8, 'calc(50% + 380px)', 250, 56, 56, 18, '#4d7b93', '#335a6e', 10, 6], [9, 'calc(50% - 120px)', 820, 120, 52, 20, '#1a2c54', '#0f1b37', -5, 6], [10, 'calc(50% + 120px)', 24, 44, 44, 14, '#8351a8', '#5e3680', 8, 5]] as const).map(([i, left, top, w, h, r, bg, edge, rot, d]) => (
              <Float key={i} i={i} at={{ left, top }} z={1}>
                <div aria-hidden="true" style={{ width: w, height: h, borderRadius: r, background: bg, transform: `rotate(${rot}deg)`, boxShadow: `0 ${d}px 0 ${edge},0 12px 20px rgba(46,15,56,.18)` }} />
              </Float>
            ))}

            {/* stickers */}
            <div aria-hidden="true" style={{ position: 'absolute', left: 'calc(50% - 560px)', top: -80, zIndex: 4, transform: 'rotate(-9deg)' }}>
              <div style={{ position: 'absolute', left: 44, top: -12, width: 70, height: 22, background: 'rgba(230,219,239,.85)', transform: 'rotate(4deg)', zIndex: 2 }} />
              <div style={{ width: 150, height: 118, border: '7px solid #fff', borderRadius: 18, boxShadow: '0 6px 14px rgba(46,15,56,.22)', background: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="crayons" size={100} variant="detail" /></div>
            </div>
            <div aria-hidden="true" style={{ position: 'absolute', left: 'calc(50% + 230px)', top: 822, zIndex: 2, transform: 'rotate(7deg)' }}>
              <div style={{ width: 130, height: 104, border: '7px solid #fff', borderRadius: 18, boxShadow: '0 6px 14px rgba(46,15,56,.22)', background: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="tissues" size={86} variant="detail" /></div>
            </div>

            {/* hand-written notes */}
            <div aria-hidden="true" style={hand(30, '#2e0f38', { position: 'absolute', left: 'calc(50% - 360px)', top: 12, zIndex: 5, transform: 'rotate(-6deg)' })}>
              two clicks. done.
              <svg width="90" height="60" viewBox="0 0 90 60" style={{ position: 'absolute', left: -90, top: 24 }}><path d="M86 8 C60 4, 26 18, 10 50" fill="none" stroke="#2e0f38" strokeWidth="2.5" strokeLinecap="round" /><path d="M10 50 L11 37 M10 50 L21 44" fill="none" stroke="#2e0f38" strokeWidth="2.5" strokeLinecap="round" /></svg>
            </div>
            <div aria-hidden="true" style={hand(26, '#8351a8', { position: 'absolute', left: 'calc(50% + 300px)', top: -40, zIndex: 5, transform: 'rotate(4deg)', width: 170, lineHeight: 1, textAlign: 'right' })}>
              stock only moves when you approve
              <svg width="60" height="40" viewBox="0 0 60 40" style={{ position: 'absolute', right: -56, top: 22 }}><path d="M2 8 C30 2, 50 14, 54 34" fill="none" stroke="#8351a8" strokeWidth="2.5" strokeLinecap="round" /><path d="M54 34 L46 26 M54 34 L58 23" fill="none" stroke="#8351a8" strokeWidth="2.5" strokeLinecap="round" /></svg>
            </div>
            <div aria-hidden="true" style={hand(26, '#1a2c54', { position: 'absolute', left: 'calc(50% + 470px)', top: 480, zIndex: 5, transform: 'rotate(-5deg)' })}>
              never lose LT-001 again
              <div style={{ position: 'absolute', left: -18, top: -10, width: 250, height: 52, border: '2.5px solid #b45dbb', borderRadius: '60% 40% 55% 45% / 55% 60% 40% 45%', transform: 'rotate(3deg)' }} />
            </div>
            <div aria-hidden="true" style={hand(26, '#8351a8', { position: 'absolute', left: 'calc(50% - 300px)', top: 810, zIndex: 5, transform: 'rotate(3deg)' })}>auto-added when stock runs low ★</div>
          </div>

          <div role="status" style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 20, display: sent ? 'block' : 'none', background: '#2e0f38', color: '#f6f1f8', padding: '14px 22px', borderRadius: 16, fontWeight: 700, boxShadow: '0 6px 0 #1a0621,0 14px 30px rgba(46,15,56,.3)' }}>
            Request sent — awaiting approval
          </div>
        </section>

        {/* how it works */}
        <section id="how" aria-labelledby="how-h" className="landing-how" style={{ maxWidth: 1320, margin: '60px auto 0', padding: '40px 40px 100px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginBottom: 40, flexWrap: 'wrap' }}>
            <h2 id="how-h" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 52, letterSpacing: '-0.02em', margin: 0 }}>How the closet stays full</h2>
            <svg width="120" height="20" viewBox="0 0 120 20" aria-hidden="true"><path d="M2 10 C14 2, 22 18, 34 10 S56 2, 68 10 S90 18, 118 8" fill="none" stroke="#b45dbb" strokeWidth="3" strokeLinecap="round" /></svg>
          </div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 28 }}>
            {([
              ['01', 'Teachers request', 'The inventory list is the first screen they see, with a Request button on every item. Anything not listed can be requested with a product link and a needed-by date.', '28px 22px 30px 20px / 22px 30px 20px 28px'],
              ['02', 'You approve', "Approve, deny or edit the quantity first. Stock is deducted on approval, never before, and requests that exceed what's on the shelf are flagged so you see them right away.", '22px 30px 20px 28px / 30px 20px 28px 22px'],
              ['03', 'The list reorders for you', 'Low stock adds "Order more tissues" to your to-do list with the pack size and saved product link. Mark it received and the right count goes back on the shelf.', '30px 20px 26px 24px / 20px 26px 24px 30px']
            ] as const).map(([n, t, body, r]) => (
              <li key={n} style={{ background: '#fff', padding: 30, border: '2px solid #2e0f38', borderRadius: r, boxShadow: '0 6px 0 #2e0f38' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#8351a8', marginBottom: 14 }}>{n}</div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, margin: '0 0 10px' }}>{t}</h3>
                <p style={{ fontSize: 17, lineHeight: 1.55, margin: 0, color: '#3d2547', textWrap: 'pretty' }}>{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer style={{ background: '#2e0f38', color: '#f6f1f8' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '48px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Star size={26} fill="#d9b3dd" />
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 24 }}>Supplock</span>
            <span style={{ fontFamily: 'var(--font-hand)', fontSize: 26, color: '#e3c6e6', marginLeft: 8 }}>Supplies, locked in.</span>
          </div>
          <Link href="/login?mode=create" style={{ background: '#b45dbb', color: '#fff', fontWeight: 700, padding: '15px 26px', borderRadius: 18, boxShadow: '0 5px 0 #8a3f90', textDecoration: 'none' }}>Start tracking supplies</Link>
        </div>
      </footer>
    </div>
  );
}

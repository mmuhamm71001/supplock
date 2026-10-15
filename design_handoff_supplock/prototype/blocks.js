// Supplock floating widget block — the chunky, tilted, extruded block used on the landing page.
// <sl-block color="purple|orchid|teal|navy|ink|berry|lavender|mist|pink|paper" tilt="-6" float="2" [deco] [nofloat] [settle="0.2"] [mhide] [radius="30"]>
(function () {
  if (customElements.get('sl-block')) return;
  const C = {
    purple: ['#8351a8', '#fff', '#5e3680'], orchid: ['#bf6cc6', '#2e0f38', '#8a3f90'], teal: ['#4d7b93', '#fff', '#335a6e'],
    navy: ['#1a2c54', '#f6f1f8', '#0f1b37'], ink: ['#2e0f38', '#f6f1f8', '#1a0621'], berry: ['#8c1c45', '#fff', '#5e1230'],
    lavender: ['#e6dbef', '#2e0f38', '#c2abd4'], mist: ['#dce8ee', '#1a2c54', '#9ebccb'], pink: ['#f1dff3', '#2e0f38', '#d9b3dd'], paper: ['#fffdfb', '#2e0f38', '#2e0f38']
  };
  let rules = 'sl-block{--bg:#8351a8;--fg:#fff;--edge:#5e3680;--tilt:0deg;--dur:6s;--delay:0s;--sd:0s;--rad:30px}';
  for (const k in C) rules += `sl-block[color="${k}"]{--bg:${C[k][0]};--fg:${C[k][1]};--edge:${C[k][2]}}`;
  for (let t = -100; t <= 100; t += 5) { const v = t / 10; rules += `sl-block[tilt="${v}"]{--tilt:${v}deg}`; }
  for (let f = 0; f <= 9; f++) rules += `sl-block[float="${f}"]{--dur:${(6 + (f % 5) * .8).toFixed(1)}s;--delay:${(-f * 1.3).toFixed(1)}s}`;
  for (let d = 0; d <= 100; d += 5) { const v = d / 100; rules += `sl-block[settle="${v}"]{--sd:${v}s}`; }
  for (let r = 6; r <= 48; r += 2) rules += `sl-block[radius="${r}"]{--rad:${r}px}`;
  const css = rules + `
sl-block{display:block;box-sizing:border-box;border-radius:var(--rad);background:var(--bg);color:var(--fg);box-shadow:0 8px 0 var(--edge),0 18px 30px rgba(46,15,56,.2),0 4px 8px rgba(46,15,56,.12);rotate:var(--tilt);transition:rotate .25s cubic-bezier(.3,1.4,.5,1),transform .25s cubic-bezier(.3,1.4,.5,1);animation:sl-float var(--dur) ease-in-out var(--delay) infinite}
sl-block[color=paper]{border:2px solid #2e0f38}
sl-block[nofloat]{animation:none}
sl-block:not([deco]):hover,sl-block:not([deco]):focus-within{rotate:0deg;transform:translateY(-8px)}
sl-block[deco]{pointer-events:none;user-select:none}
sl-block[settle]{animation:sl-settle .9s cubic-bezier(.3,1.4,.5,1) var(--sd) both,sl-float var(--dur) ease-in-out calc(var(--sd) + .9s) infinite}
@keyframes sl-float{0%,100%{translate:0 0}50%{translate:0 -8px}}
@keyframes sl-settle{0%{translate:0 70px;opacity:0;scale:.7}70%{opacity:1}100%{translate:0 0;opacity:1;scale:1}}
@media (prefers-reduced-motion:reduce){sl-block,sl-block[settle]{animation:none!important;transition:none!important}}
@media (max-width:700px){sl-block[deco][mhide]{display:none!important}sl-block[deco]{scale:.78}}`;
  const ensure = () => { if (document.getElementById('sl-block-css') || !document.head) return; const st = document.createElement('style'); st.id = 'sl-block-css'; st.textContent = css; document.head.appendChild(st); };
  ensure();
  class SLBlock extends HTMLElement {
    connectedCallback() { ensure(); if (this.hasAttribute('deco') && this.getAttribute('aria-hidden') !== 'true') this.setAttribute('aria-hidden', 'true'); }
  }
  customElements.define('sl-block', SLBlock);
})();

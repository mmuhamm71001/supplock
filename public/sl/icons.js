// Supplock sketchbook illustrations. <sl-icon name="markers" size="48" [variant="detail|simple"] [tint]> or <sl-icon label="Dry-erase markers">. Vector, so crisp at any pixel density; detail versions lazy-render on scroll.
(function () {
  if (window.SLIcons) return;
  const INK = '#2e0f38', P = '#8351a8', O = '#b45dbb', T = '#4d7b93', N = '#1a2c54', LP = '#e6dbef', LO = '#f1dff3', LT = '#dce8ee', LN = '#dde2ee', W = '#fffdf8';
  const DARK = new Set([P, O, T, N]);
  const f2 = n => Math.round(n * 100) / 100;

  function kit(seed) {
    let s = 2166136261; for (const c of seed) { s ^= c.charCodeAt(0); s = Math.imul(s, 16777619) >>> 0; }
    const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const j = a => (r() - .5) * 2 * a;
    const line = (x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const o1 = .5 + r() * 1.3, o2 = .5 + r() * 1.3, b = j(Math.min(.9, L * .04));
      const ax = x1 - ux * o1 + j(.3), ay = y1 - uy * o1 + j(.3), bx = x2 + ux * o2 + j(.3), by = y2 + uy * o2 + j(.3);
      return `M${f2(ax)} ${f2(ay)}Q${f2((x1 + x2) / 2 - uy * b)} ${f2((y1 + y2) / 2 + ux * b)} ${f2(bx)} ${f2(by)}`;
    };
    const polyS = (pts) => pts.map((a, i) => { const b = pts[(i + 1) % pts.length]; return line(a[0], a[1], b[0], b[1]); }).join('');
    const polyF = pts => 'M' + pts.map(p => p.join(' ')).join('L') + 'Z';
    const ellS = (cx, cy, rx, ry) => {
      const cnt = Math.max(8, Math.round((rx + ry) * .9)), st = r() * 6.28, sw = 6.28 * (1.06 + r() * .06), pts = [];
      for (let i = 0; i <= cnt; i++) { const a = st + sw * i / cnt, k = 1 + j(.035); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
      let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
      for (let i = 0; i < cnt; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(cnt, i + 2)];
        d += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
      }
      return d;
    };
    const ellF = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
    const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    return {
      rand: r,
      rect: (x, y, w, h, c) => ({ f: c && polyF(box(x, y, w, h)), c, s: polyS(box(x, y, w, h)) }),
      poly: (pts, c) => ({ f: c && polyF(pts), c, s: polyS(pts) }),
      ell: (cx, cy, rx, ry, c) => ({ f: c && ellF(cx, cy, rx, ry), c, s: ellS(cx, cy, rx, ry) }),
      path: (d, c, sd) => ({ f: c && d, c, s: sd ?? d }),
      ln: (a, b, c, d) => ({ s: line(a, b, c, d) }),
      curve: (d, w) => ({ s: d, w }),
      hi: d => ({ h: d }),
      g: (t, list) => list.map(e => ({ ...e, t: (t + ' ' + (e.t || '')).trim() }))
    };
  }

  const ICONS = {
    markers: ['Markers', k => k.g('rotate(38 24 24)', [k.rect(19, 16, 10, 20, LO), k.rect(19, 22, 10, 5, O), k.rect(19, 5, 10, 11, N), k.poly([[21, 36], [27, 36], [25.5, 42.5], [22.5, 42.5]], N), k.hi('M21.6 7.5L21.6 13'), k.hi('M21.4 23.4L21.4 25.6')])],
    highlighter: ['Highlighters', k => [k.path('M4 38.5Q4 37 6 37L21 37.5Q23 38 22.5 40L22 42Q21.5 43.5 20 43.5L6 43Q4 43 4 41.5Z', LO, ''), k.curve('M5 45.5L19 45.8', 1.2), ...k.g('rotate(35 26 22)', [k.rect(20, 4, 13, 10, N), k.rect(20, 14, 13, 20, O), k.rect(20, 19, 13, 4.5, LO), k.poly([[21, 34], [32, 34], [30, 38.5], [23, 38.5]], LO), k.poly([[23, 38.5], [30, 38.5], [29, 42.5], [24, 40.5]], P), k.hi('M22.6 7L22.6 11.5'), k.hi('M22.6 26L22.6 31')])]],
    crayons: ['Crayons', k => [...k.g('rotate(-12 18 26)', [k.rect(13, 16, 10, 25, O), k.poly([[14, 16], [22, 16], [18, 6.5]], O), k.ln(13, 20, 23, 20), k.ln(13, 36, 23, 36), k.hi('M15.6 22.5L15.6 33')]), ...k.g('rotate(12 30 26)', [k.rect(25, 16, 10, 25, T), k.poly([[26, 16], [34, 16], [30, 6.5]], T), k.ln(25, 20, 35, 20), k.ln(25, 36, 35, 36), k.hi('M27.6 22.5L27.6 33')])]],
    pencils: ['Pencils', k => k.g('rotate(40 24 24)', [k.rect(20, 4, 8, 5, O), k.rect(20, 9, 8, 4, LN), k.ln(20, 11, 28, 11), k.rect(20, 13, 8, 22, P), k.ln(24, 14, 24, 34), k.poly([[20, 35], [28, 35], [24, 43]], LO), k.poly([[22.6, 40.2], [25.4, 40.2], [24, 43]], N), k.hi('M21.8 16L21.8 31')])],
    pens: ['Pens', k => k.g('rotate(40 24 24)', [k.rect(22.5, 2, 3, 4, N), k.rect(20, 6, 8, 27, T), k.poly([[28, 8], [30.5, 8], [30.5, 20], [28, 22]], N), k.rect(20, 33, 8, 5, N), k.poly([[20.5, 38], [27.5, 38], [24, 44]], LT), k.hi('M22 9L22 29')])],
    glue: ['Glue sticks', k => [k.rect(16, 16, 16, 23, LP), k.rect(18.5, 21, 11, 12, P), k.ln(20.5, 25, 27.5, 25), k.rect(15, 39, 18, 4, N), k.rect(15.5, 6, 17, 10, O), k.hi('M18.3 8.5L18.3 13'), k.hi('M20.5 29.5L24 29.5')]],
    'glue-gun': ['Glue gun', k => [k.rect(40, 15.5, 6, 6.5, W), k.poly([[14, 12], [37, 12], [40, 14.5], [40, 23.5], [37, 26], [14, 26]], T), k.poly([[14, 15.5], [8, 17.5], [4.5, 19], [8, 20.5], [14, 22.5]], N), k.ell(4.6, 23.6, 1.5, 2, W), k.poly([[19, 26], [23.5, 26], [23.5, 33.5], [19.5, 32]], LT), k.poly([[25, 26], [34, 26], [37, 42.5], [27.5, 42.5]], N), k.rect(18, 15.5, 15, 4, LT), k.ln(28, 30, 33.5, 30), k.hi('M16.5 22.6L30 22.6'), k.hi('M27 34L28.3 40')]],
    scissors: ['Scissors', k => [k.poly([[17.5, 30], [20.5, 31.5], [33.5, 5]], LT), k.poly([[28.5, 31], [25.5, 32], [14.5, 5]], LT), k.ell(15, 36, 6.5, 5.5, O), k.ell(15, 36, 3, 2.4, W), k.ell(32, 36, 6.5, 5.5, O), k.ell(32, 36, 3, 2.4, W), k.ell(23.4, 21.5, 1.4, 1.4, N), k.hi('M10.5 33.5Q11.5 31.5 13.5 31')]],
    paper: ['Copy paper', k => [k.poly([[6, 19], [28, 12], [42, 18], [20, 25]], W), k.poly([[6, 19], [20, 25], [20, 37], [6, 31]], LN), k.poly([[20, 25], [42, 18], [42, 30], [20, 37]], P), k.poly([[25, 27.5], [37, 23.6], [37, 28.4], [25, 32.3]], W), k.ln(7.5, 23.5, 18.5, 28.3), k.ln(7.5, 27, 18.5, 31.8), k.hi('M22.5 34L24.5 33.3'), k.hi('M38.6 21.5L38.6 25')]],
    construction: ['Construction paper', k => [...k.g('rotate(-13 24 26)', [k.rect(8, 11, 30, 24, T)]), ...k.g('rotate(-3 24 26)', [k.rect(9, 12, 30, 24, O)]), ...k.g('rotate(8 24 26)', [k.rect(10, 13, 30, 24, P), k.poly([[25, 17.5], [27.3, 22.2], [32.4, 22.6], [28.4, 25.8], [29.8, 30.8], [25, 28], [20.2, 30.8], [21.6, 25.8], [17.6, 22.6], [22.7, 22.2]], LP), k.hi('M13 33L19 33')])]],
    paperclips: ['Paper clips', k => [...k.g('rotate(-8 22 26)', [k.rect(8, 12, 26, 32, LN), k.rect(10, 9, 26, 32, W), k.ln(14, 22, 31, 22), k.ln(14, 27, 31, 27), k.ln(14, 32, 26, 32), k.path('M17 4L17 17Q17 20.5 20 20.5Q23 20.5 23 17L23 6Q23 3.5 20.5 3.5Q18.5 3.5 18.5 6L18.5 15', LP, 'M18.5 15L18.5 6Q18.5 3.5 20.5 3.5Q23 3.5 23 6L23 17Q23 20.5 20 20.5Q17 20.5 17 17L17 4')]), ...k.g('rotate(-35 36 34)', [k.path('M33 22L33 40Q33 44 36.5 44Q40 44 40 40L40 24.5Q40 21.5 37.5 21.5Q35 21.5 35 24.5L35 37', O, 'M35 37L35 24.5Q35 21.5 37.5 21.5Q40 21.5 40 24.5L40 40Q40 44 36.5 44Q33 44 33 40L33 22')])]],
    notebook: ['Notebooks', k => [k.rect(16, 8, 23, 35, W), k.rect(13, 6, 24, 35, T), k.rect(19, 12, 13, 7, W), k.ln(21, 15.5, 30, 15.5), ...[10, 16, 22, 28, 34].map(y => k.ell(13, y + 2, 2.6, 1.7, null)), k.hi('M33.5 24L33.5 37')]],
    tissues: ['Tissues', k => [k.poly([[8, 22], [14, 17], [44, 17], [40, 22]], LO), k.poly([[40, 22], [44, 17], [44, 35], [40, 40]], N), k.rect(8, 22, 32, 18, P), k.ell(28, 19.5, 7, 1.5, N), k.path('M21 20C18.5 12 23.5 8.5 26 12C27 5.5 34.5 6.5 32.5 13C36.5 12 37.5 18.5 34 20Z', W), k.curve('M12 31C15 27 18 35 21 31S27 27 30 31S35 35 37 31'), k.hi('M11 25.5L15 25.5')]],
    wipes: ['Disinfecting wipes', k => [k.path('M14 16L14 39Q24 44.5 34 39L34 16Z', T, 'M14 16L14 39Q24 44.5 34 39L34 16'), k.rect(17.5, 23, 13, 11, LT), k.curve('M19.5 28.5C21.5 26 23.5 31 25.5 28.5S28.5 26 29 28'), k.path('M13.5 15L13.5 11Q24 7 34.5 11L34.5 15Q24 19 13.5 15Z', N), k.path('M21.5 10C19.5 4 26 1.5 25 6C28 2.5 31 7 27.5 9.5Z', W), k.hi('M16.6 19L16.6 37')]],
    earbuds: ['Earbuds', k => [k.curve('M15.5 31C15.5 40 24 40 24 45M32.5 31C32.5 40 24 40 24 45'), ...k.g('rotate(-10 15 18)', [k.rect(13, 19.5, 4, 11.5, P), k.ell(15, 14, 6.5, 6.5, P), k.ell(15, 14, 3, 3, LP), k.hi('M11.4 11.4Q12.2 9.6 14 9')]), ...k.g('rotate(10 33 18)', [k.rect(31, 19.5, 4, 11.5, P), k.ell(33, 14, 6.5, 6.5, P), k.ell(33, 14, 3, 3, LP)])]],
    sharpener: ['Pencil sharpener', k => [k.rect(3, 23.5, 11, 5, P), k.poly([[14, 23.5], [14, 28.5], [18, 26]], LO), k.rect(18, 14, 22, 24, O), k.rect(26, 10, 8, 4, N), k.ell(18, 26, 1.6, 3.4, N), k.rect(23, 28, 12, 6, LO), k.curve('M40 32C46 32 46 42 40 44'), k.hi('M21 17L21 24'), k.hi('M5 25.2L9 25.2')]],
    'sharpener-hand': ['Handheld sharpener', k => [...k.g('rotate(-32 16 18)', [k.rect(3, 14, 18, 7, P), k.poly([[21, 14], [21, 21], [27, 17.5]], LO), k.poly([[25, 16.3], [25, 18.7], [27, 17.5]], N)]), k.rect(20, 18, 21, 16, T), k.rect(30, 16, 9, 3, N), k.ell(34.5, 17.5, 1.2, 1, LN), k.ell(24, 26, 3, 3.6, N), k.curve('M10 40C13 36 17 42 20 38'), k.curve('M23 43C25 40.5 28.5 44 30 41'), k.hi('M23 21L23 30'), k.hi('M33 22L38 22')]],
    cushion: ['Wobble cushion', k => [k.path('M6 24L6 30C6 38.5 42 38.5 42 30L42 24Z', T, 'M6 24L6 30C6 38.5 42 38.5 42 30L42 24'), k.ell(24, 24, 18, 8, LT), ...[[14, 21], [20, 19], [28, 19], [34, 21], [13, 27], [35, 27], [20, 29], [28, 29]].map(([x, y]) => k.ell(x, y, 1.3, 1.1, T)), k.ell(24, 24, 3, 1.6, N), k.hi('M10 32.5Q12 34 15 34.6')]],
    tape: ['Tape', k => [k.ell(22, 24, 15, 15, O), k.ell(22, 24, 7, 7, W), k.ell(22, 24, 10, 10, null), k.poly([[31, 35.5], [43, 41], [41.5, 45], [29, 38.5]], LO), k.hi('M11.5 19Q13.5 13.5 19 11.2')]],
    folders: ['Folders', k => [k.poly([[6, 11], [18, 11], [21, 15], [42, 15], [42, 40], [6, 40]], N), k.rect(10, 13, 27, 16, W), k.ln(13, 17, 26, 17), k.poly([[5, 21], [43, 21], [41, 40], [7, 40]], P), k.hi('M9.5 25L11 36')]],
    laptop: ['Laptop', k => [k.rect(10, 8, 28, 21, N), k.rect(13, 11, 22, 15, LT), k.poly([[7, 30], [41, 30], [45, 37.5], [3, 37.5]], LP), k.rect(20, 32.5, 8, 3, null), k.hi('M11.6 10.5L11.6 22')]],
    'laptop-zoom': ['Laptop · Zoom', k => [k.rect(5, 15, 26, 19, N), k.rect(8, 18, 20, 13, LT), k.poly([[3, 35], [33, 35], [36.5, 41.5], [-0.5, 41.5]], LP), k.ell(36, 13, 9, 9, O), k.rect(30.5, 10, 7, 6, W), k.poly([[37.5, 11.6], [41, 9.8], [41, 16.2], [37.5, 14.4]], W), k.hi('M29.5 7.5Q31.5 5.5 34 5')]],
    book: ['Books', k => [k.rect(9, 7, 25, 34, P), k.poly([[34, 9], [39, 11.5], [39, 43], [34, 41]], W), k.ln(36, 16, 36, 38), k.ln(13.5, 7, 13.5, 41), k.rect(18, 14, 12, 7, LP), k.hi('M11.2 24L11.2 36')]],
    furniture: ['Furniture', k => [k.rect(4, 15, 40, 6, T), k.rect(7, 21, 4, 21, N), k.rect(37, 21, 4, 21, N), k.rect(24, 21, 13, 10, LT), k.ell(30.5, 26, 1.4, 1.4, N), k.rect(13, 34, 9, 3, LT), k.hi('M8 17.6L18 17.6')]],
    ball: ['Sports ball', k => [k.ell(24, 24, 17, 17, O), k.curve('M7.5 24C16 22 32 22 40.5 24'), k.curve('M24 7C22 16 22 32 24 41'), k.curve('M12.5 11.5C19 18 19 30 12.5 36.5'), k.curve('M35.5 11.5C29 18 29 30 35.5 36.5'), k.hi('M13.5 16.5Q15.5 12.5 19.5 10.6')]],
    shelf: ['Supply shelf', k => [k.rect(5, 4, 2.6, 40, LN), k.rect(40.4, 4, 2.6, 40, LN), k.rect(9, 12, 8, 8, P), k.rect(18.5, 9.5, 6, 10.5, T), k.rect(26, 13, 7, 7, O), k.ell(37, 15.5, 2.6, 4.5, LT), k.rect(5, 20, 38, 2.6, N), k.rect(9, 26, 10, 8, LO), k.rect(21, 23.5, 5, 10.5, N), k.rect(28, 27, 10, 7, T), k.ln(30, 30.5, 36, 30.5), k.rect(5, 34, 38, 2.6, N), k.ell(14, 41, 3, 2.4, LP), k.rect(21, 39, 12, 4.5, LO)]],
    box: ['Other (box)', k => [k.poly([[18, 14], [23, 5.5], [46, 6.5], [42, 14]], LP), k.poly([[8, 20], [18, 14], [42, 14], [32, 20]], LO), k.poly([[8, 20], [2.5, 13], [12, 8.5], [18, 14]], LP), k.poly([[32, 20], [42, 14], [42, 36], [32, 42]], P), k.rect(8, 20, 24, 22, LO), k.curve('M15.5 27.5C15.5 22.5 24.5 22.5 24.5 27.5C24.5 31 20 30.5 20 34.5', 3.4), k.ell(20, 38.6, 1.2, 1.2, INK), k.hi('M34.5 24L34.5 36')]]
  };

  const RULES = [['sharpener-hand', /(hand|individual|personal|manual|pocket|mini|single).*sharpen|sharpen.*(hand|individual|personal|manual|pocket|mini|single)/], ['sharpener', /sharpen/], ['laptop-zoom', /zoom/], ['laptop', /laptop|chromebook|\blt-\d/], ['highlighter', /highlight/], ['markers', /marker|sharpie|expo/], ['crayons', /crayon/], ['pencils', /pencil/], ['pens', /\bpens?\b|ballpoint/], ['glue-gun', /glue ?gun|hot ?glue/], ['glue', /glue/], ['scissors', /scissor/], ['notebook', /notebook|journal|composition|spiral/], ['book', /book|reader|manual|novel|dictionar/], ['ball', /ball/], ['furniture', /desk|chair|table|stool|rug|easel|\bmats?\b|cabinet|bookcase|furniture/], ['paperclips', /paper ?clips?|binder clips?/], ['construction', /construction|colou?red paper|craft paper|card ?stock/], ['paper', /paper|ream|index card/], ['tissues', /tissue|kleenex/], ['wipes', /wipe|disinfect|clorox|lysol/], ['earbuds', /earbud|headphone|earphone|headset/], ['cushion', /cushion|wobble/], ['tape', /tape/], ['folders', /folder|binder/]];
  const suggest = s => { s = String(s || '').toLowerCase(); for (const [n, re] of RULES) if (re.test(s)) return n; return null; };

  const cache = {};
  function inner(name, detail, tint) {
    const key = name + (detail ? ':d' : ':s') + (tint ? ':t' : ''); if (cache[key]) return cache[key];
    const k = kit(name); const els = ICONS[name][1](k).flat();
    const dx = f2(.8 + k.rand() * .9), dy = f2(.6 + k.rand() * .9);
    const tr = e => e.t ? ` transform="${e.t}"` : '';
    const filled = els.filter(e => e.f && e.c);
    const sw = (e, m) => e.w ? ` stroke-width="${f2(e.w * m)}"` : '';
    let out = '';
    if (detail) {
      const strokes = els.filter(e => e.s).map(e => `<path d="${e.s}"${tr(e)}${sw(e, .62)}/>`).join('');
      out += `<g filter="url(#sl-wc)" transform="translate(${dx} ${dy})" opacity=".8">${filled.map(e => `<path d="${e.f}" fill="${e.c}" stroke="${e.c}" stroke-width=".9" stroke-opacity=".55"${tr(e)}/>`).join('')}</g>`;
      out += `<g filter="url(#sl-wc2)" transform="translate(${f2(-dx * .7)} ${f2(dy * .5)})" opacity=".26">${filled.filter(e => e.c !== W).map(e => `<path d="${e.f}" fill="${e.c}"${tr(e)}/>`).join('')}</g>`;
      out += `<g mask="url(#sl-shade)" opacity=".62">${filled.filter(e => e.c !== W && e.c !== INK).map(e => `<path d="${e.f}" fill="url(#${DARK.has(e.c) ? 'sl-xh' : 'sl-st'})"${tr(e)}/>`).join('')}</g>`;
      out += `<g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" filter="url(#sl-rough-f)"><g stroke-width="1.45">${strokes}</g><g stroke-width=".55" opacity=".7" transform="translate(.55 .4)">${strokes}</g></g>`;
    } else {
      const strokes = els.filter(e => e.s).map(e => `<path d="${e.s}"${tr(e)}${sw(e, 1)}/>`).join('');
      out += `<g filter="url(#sl-wcs)" transform="translate(${dx} ${dy})" opacity=".92">${filled.map(e => `<path d="${e.f}" fill="${e.c}"${tr(e)}/>`).join('')}</g>`;
      out += `<g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" filter="url(#sl-rough)" stroke-width="2.7">${strokes}</g>`;
    }
    if (tint) out += '<rect x="-2" y="-2" width="52" height="52" fill="#000" filter="url(#sl-grain)"/>';
    return cache[key] = out;
  }

  const DEFS = `<defs>
    <filter id="sl-rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.8" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="sl-rough-f" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="6"/><feDisplacementMap in="SourceGraphic" scale="1.1" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="sl-wc" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.35" result="b"/><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="11" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.55" result="ga"/><feComposite in="b" in2="ga" operator="in"/></filter>
    <filter id="sl-wc2" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="21" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="4.5" xChannelSelector="G" yChannelSelector="R" result="d"/><feGaussianBlur in="d" stdDeviation="0.7"/></filter>
    <filter id="sl-wcs" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="1" seed="9" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="sl-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="8"/><feColorMatrix type="matrix" values="0 0 0 0 .18  0 0 0 0 .06  0 0 0 0 .22  0 0 0 .6 -.2"/></filter>
    <filter id="sl-sat" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="saturate" values=".72"/></filter>
    <pattern id="sl-xh" patternUnits="userSpaceOnUse" width="2.4" height="2.4"><path d="M0 0L2.4 2.4M-.6 1.8L.6 3M1.8 -.6L3 .6M0 2.4L2.4 0M-.6 .6L.6 -.6M1.8 3L3 1.8" stroke="${INK}" stroke-width=".32" fill="none"/></pattern>
    <pattern id="sl-st" patternUnits="userSpaceOnUse" width="2.2" height="2.2"><circle cx=".5" cy=".6" r=".3" fill="${INK}"/><circle cx="1.6" cy="1.7" r=".24" fill="${INK}"/></pattern>
    <linearGradient id="sl-shg" x1="0" y1="0" x2="1" y2="1"><stop offset=".4" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <mask id="sl-shade" maskUnits="userSpaceOnUse" x="-6" y="-6" width="60" height="60"><rect x="-6" y="-6" width="60" height="60" fill="url(#sl-shg)"/></mask>
  </defs>`;
  const urls = {};
  const urlFor = (n, detail, tint) => {
    const key = n + detail + tint; if (urls[key]) return urls[key];
    const px = detail ? 440 : 96;
    const body = inner(n, detail, tint);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 56 56" width="${px}" height="${px}">${DEFS}${tint ? `<g filter="url(#sl-sat)">${body}</g>` : body}</svg>`;
    return urls[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  let styled = false;
  function ensureStyle() {
    if (styled || !document.head) return; styled = true;
    const s = document.createElement('style');
    s.textContent = `sl-icon{display:inline-block;flex:none;line-height:0;vertical-align:middle}
      sl-icon>img{display:block;width:100%;height:100%;mix-blend-mode:multiply;transform:rotate(var(--r));pointer-events:none}
      sl-icon[data-tint]{border:1px solid #2e0f38;padding:3px;box-sizing:content-box}
      @keyframes sl-wiggle{0%,100%{transform:rotate(var(--r))}25%{transform:rotate(calc(var(--r) - 7deg))}50%{transform:rotate(calc(var(--r) + 5deg))}75%{transform:rotate(calc(var(--r) - 3deg))}}
      sl-icon:hover>img,tr:hover sl-icon>img,[data-wiggle]:hover sl-icon>img,button:hover>sl-icon>img{animation:sl-wiggle .5s ease-in-out}
      @media (prefers-reduced-motion:reduce){sl-icon>img{animation:none!important}}`;
    document.head.appendChild(s);
  }

  class SLIcon extends HTMLElement {
    static get observedAttributes() { return ['name', 'label', 'size', 'mono', 'tint', 'variant']; }
    connectedCallback() { if (this._rot == null) { this._rot = f2(Math.random() * 6 - 3); this.style.setProperty('--r', this._rot + 'deg'); } this.render(); }
    attributeChangedCallback(attr, oldV, newV) { if (oldV !== newV && this.isConnected) this.render(); }
    render() {
      ensureStyle();
      let n = this.getAttribute('name'); if (!ICONS[n]) n = suggest(this.getAttribute('label')) || 'box';
      const size = Math.max(40, +this.getAttribute('size') || 48);
      const v = this.getAttribute('variant'); const detail = v === 'detail' || (v !== 'simple' && size >= 96);
      const on = x => { const y = this.getAttribute(x); return y != null && y !== 'false' && y !== '0'; };
      const tint = on('tint') || on('mono');
      const key = n + '|' + size + '|' + detail + '|' + tint; if (this._key === key) return; this._key = key;
      if (tint !== this.hasAttribute('data-tint')) tint ? this.setAttribute('data-tint', '') : this.removeAttribute('data-tint');
      const px = size + 'px'; if (this.style.width !== px) { this.style.width = px; this.style.height = px; }
      let img = this.firstElementChild;
      if (!img || img.tagName !== 'IMG') { this.textContent = ''; img = document.createElement('img'); img.alt = ''; img.decoding = 'async'; this.appendChild(img); }
      img.loading = detail ? 'lazy' : 'eager';
      const src = urlFor(n, detail, tint); if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    }
  }
  if (!customElements.get('sl-icon')) customElements.define('sl-icon', SLIcon);
  window.SLIcons = { suggest, list: Object.keys(ICONS).filter(id => id !== 'shelf').map(id => ({ id, label: ICONS[id][0] })) };
})();

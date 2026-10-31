// Misure dentro la pagina (iniettate con page.evaluate). Restituisce un oggetto con:
// hov (scroll orizzontale), off (elementi fuori dallo schermo non dentro un contenitore che scorre),
// svgOv (testi SVG che si sovrappongono), htmlOv (testi HTML che si sovrappongono), clip (testo tagliato),
// small (aree da toccare < 24 px senza la deroga della spaziatura), contrast (testi sotto AA), font (testo SVG < 10 px reali).
// eslint-disable-next-line no-unused-vars
function __audit(opts) {
  const W = innerWidth;
  const vis = (el) => {
    if (!el.isConnected) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      if (e.tagName === 'DETAILS' && !e.open && e !== el && !(el.closest('summary') && el.closest('summary').parentElement === e)) return false;
      if (e.hidden) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const scroller = (el) => {
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return e;
    }
    return null;
  };
  const path = (el) => {
    const p = [];
    for (let e = el; e && e.nodeType === 1 && p.length < 4; e = e.parentElement) p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : ''));
    return p.join('>');
  };
  const out = { hov: document.scrollingElement.scrollWidth - W };
  const root = opts && opts.root ? document.querySelector(opts.root) : document.body;
  // elementi fuori dallo schermo
  out.off = [];
  for (const el of root.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName !== 'svg') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > W + 1 || r.left < -1) {
      if (scroller(el)) continue;
      if (!vis(el)) continue;
      out.off.push(`${path(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
  }
  out.off = out.off.slice(0, 20);
  // testi SVG che si sovrappongono
  out.svgOv = [];
  out.font = [];
  for (const svg of root.querySelectorAll('svg')) {
    if (!vis(svg)) continue;
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const sr = svg.getBoundingClientRect();
    const k = vb && vb.width ? sr.width / vb.width : 1;
    const ts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim() && vis(t));
    const rs = ts.map((t) => t.getBoundingClientRect());
    for (let i = 0; i < ts.length; i++) {
      const fs = parseFloat(getComputedStyle(ts[i]).fontSize) * k;
      if (fs < 10) out.font.push(`${svg.id || path(svg)} «${ts[i].textContent.slice(0, 20)}» ${fs.toFixed(1)}px`);
      for (let j = i + 1; j < ts.length; j++) {
        const a = rs[i], b = rs[j];
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        // le scatole dei testi hanno ~20% di spazio vuoto sopra e sotto: contano le sovrapposizioni vere
        if (w > 2 && h > Math.min(a.height, b.height) * 0.35) out.svgOv.push(`${svg.id || path(svg)}: «${ts[i].textContent.slice(0, 24)}» × «${ts[j].textContent.slice(0, 24)}» (${Math.round(w)}×${Math.round(h)} px @${Math.round(a.left)},${Math.round(a.top + scrollY)})`);
      }
    }
    // testi che escono dall'SVG
    for (let i = 0; i < ts.length; i++) {
      const a = rs[i];
      if (a.left < sr.left - 1 || a.right > sr.right + 1 || a.top < sr.top - 1 || a.bottom > sr.bottom + 1) out.svgOv.push(`${svg.id || path(svg)}: «${ts[i].textContent.slice(0, 24)}» esce dall'SVG (${Math.round(a.left - sr.left)},${Math.round(a.top - sr.top)} ${Math.round(a.right - sr.right)},${Math.round(a.bottom - sr.bottom)})`);
    }
  }
  out.font = [...new Set(out.font)].slice(0, 30);
  // testi HTML (foglie) che si sovrappongono
  const leaves = [];
  for (const el of root.querySelectorAll('body *:not(svg):not(svg *):not(script):not(style):not(option)')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!vis(el)) continue;
    if (el.closest('.tip, dialog:not([open])')) continue;
    const range = document.createRange(); range.selectNodeContents(el);
    for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) leaves.push({ el, r });
  }
  out.htmlOv = [];
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const A = leaves[i], B = leaves[j];
    if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const a = A.r, b = B.r;
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 2 && h > Math.min(a.height, b.height) * 0.4) {
      // contenuti in contenitori scorrevoli diversi possono sovrapporsi in modo legittimo (testata fissa delle tabelle)
      if (getComputedStyle(A.el).position === 'sticky' || getComputedStyle(B.el).position === 'sticky' || A.el.closest('th') || B.el.closest('th')) continue;
      out.htmlOv.push(`${path(A.el)} «${A.el.textContent.trim().slice(0, 20)}» × ${path(B.el)} «${B.el.textContent.trim().slice(0, 20)}» (${Math.round(w)}×${Math.round(h)} @${Math.round(a.left)},${Math.round(a.top + scrollY)})`);
    }
  }
  out.htmlOv = out.htmlOv.slice(0, 20);
  // testo tagliato
  out.clip = [];
  for (const el of root.querySelectorAll('body *:not(svg):not(svg *)')) {
    const cs = getComputedStyle(el);
    if (!(cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis')) continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.textContent.trim() && vis(el) && el.clientWidth > 0) out.clip.push(`${path(el)} «${el.textContent.trim().slice(0, 30)}» ${el.scrollWidth}>${el.clientWidth}`);
  }
  for (const el of root.querySelectorAll('input[placeholder], select')) {
    if (!vis(el)) continue;
    if (el.tagName === 'SELECT') {
      const o = el.options[el.selectedIndex]; if (!o) continue;
      const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(el);
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const need = c.measureText(o.text).width + 28;
      if (need > el.clientWidth + 2) out.clip.push(`${path(el)} select «${o.text}» serve ${Math.round(need)} > ${el.clientWidth}`);
    } else if (!el.value) {
      const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(el);
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const need = c.measureText(el.placeholder).width * (cs.textTransform === 'uppercase' ? 1.08 : 1);
      if (need > el.clientWidth + 2) out.clip.push(`${path(el)} placeholder «${el.placeholder}» serve ${Math.round(need)} > ${el.clientWidth}`);
    }
  }
  out.clip = out.clip.slice(0, 20);
  // aree da toccare
  out.small = [];
  const T = [...root.querySelectorAll('a[href], button, select, input:not([type=hidden]), summary, [role=tab], [tabindex]:not([tabindex="-1"]), label:has(input)')].filter((e) => vis(e) && !e.closest('.tip'));
  const rect = T.map((e) => e.getBoundingClientRect());
  T.forEach((e, i) => {
    const r = rect[i];
    if (r.width >= 24 && r.height >= 24) return;
    // link dentro una frase: esenti (WCAG 2.5.8, eccezione «inline»)
    if (e.tagName === 'A' && e.closest('p, li, dd, td.note, .note')) return;
    if (e.tagName === 'INPUT' && e.closest('label') && e.closest('label').getBoundingClientRect().height >= 24) return;
    // deroga della spaziatura: un cerchio di 24 px centrato non tocca altri bersagli
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let near = Infinity;
    rect.forEach((q, j) => {
      if (j === i || T[j].contains(e) || e.contains(T[j])) return;
      const dx = Math.max(q.left - cx, 0, cx - q.right), dy = Math.max(q.top - cy, 0, cy - q.bottom);
      near = Math.min(near, Math.hypot(dx, dy));
    });
    if (near >= 12) return;
    out.small.push(`${path(e)} «${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18)}» ${Math.round(r.width)}×${Math.round(r.height)} (vicino a ${near.toFixed(0)} px)`);
  });
  out.smallN = out.small.length;
  out.small = out.small.slice(0, 40);
  // contrasto
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (fg, bg, a) => [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
  const bgOf = (el) => {
    const stack = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (e instanceof SVGElement && e.tagName !== 'svg') continue;
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; }
    }
    let bg = [255, 255, 255];
    const htmlBg = parse(getComputedStyle(document.body).backgroundColor);
    if (htmlBg && htmlBg[3] > 0) bg = htmlBg.slice(0, 3);
    for (let i = stack.length - 1; i >= 0; i--) bg = mix(stack[i], bg, stack[i][3]);
    return bg;
  };
  const opac = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  out.contrast = [];
  const seen = new Set();
  for (const el of root.querySelectorAll('body *:not(script):not(style):not(option)')) {
    const isSvgText = el instanceof SVGElement;
    if (isSvgText && el.tagName !== 'text' && el.tagName !== 'tspan') continue;
    if (!isSvgText && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (isSvgText && !el.textContent.trim()) continue;
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    let fg = parse(isSvgText ? cs.fill : cs.color); if (!fg) continue;
    let a = fg[3] * opac(el) * (isSvgText ? +cs.fillOpacity : 1);
    const bg = bgOf(el);
    const col = mix(fg, bg, a);
    const r = ratio(col, bg);
    const fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = fs >= 24 || (fs >= 18.66 && bold) ? 3 : 4.5;
    if (r < need) {
      // testo SVG con alone (paint-order stroke) su un rettangolo colorato: va controllato a mano
      const key = `${path(el)}|${cs.color}|${cs.fill}`;
      if (seen.has(key)) continue; seen.add(key);
      out.contrast.push(`${path(el)} «${el.textContent.trim().slice(0, 20)}» ${r.toFixed(2)} < ${need} (fg ${col.map(Math.round)} bg ${bg.map(Math.round)}${isSvgText ? ' svg' : ''})`);
    }
  }
  out.contrast = out.contrast.slice(0, 40);
  return out;
}
module.exports = { __audit };

// Confronto tra ciò che la pagina mostra (riquadri e riquadro dei valori del grafico) e il ricalcolo indipendente
// (ricalcolo.json). Uso: BASE=http://127.0.0.1:8792/ NODE_PATH=$(npm root -g) node browser.cjs
// Variabile VIXJSON: un file vix.json alternativo servito al posto di data/vix.json (per i controlli che devono fallire).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8792/';
const RC = JSON.parse(fs.readFileSync(path.join(__dirname, 'ricalcolo.json'), 'utf8'));
const S = RC.series;
let fail = 0, checks = 0;
const ok = (c, m) => { checks++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const it = (v, d) => (v == null ? '—' : (v < 0 && Math.abs(v).toFixed(d) !== (0).toFixed(d) ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ','));
const sg = (v, d) => (v == null ? '—' : (v > 0 && Math.abs(v).toFixed(d) !== (0).toFixed(d) ? '+' : '') + it(v, d) + '%');
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  if (process.env.VIXJSON) { const body = fs.readFileSync(process.env.VIXJSON, 'utf8'); await c.route('**/data/vix.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body })); }
  const p = await c.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 60000 }); await p.waitForTimeout(1000);
  const kpis = await p.$$eval('#vxKpis .kpi', (a) => a.map((k) => ({ k: k.querySelector('.k').textContent, v: k.querySelector('.v').textContent, s: k.querySelector('.s').textContent })));
  console.log(JSON.stringify(kpis, null, 1));
  console.log('meta:', await p.textContent('#vxMeta'));
  await p.screenshot({ path: path.join(__dirname, 'vix-1440.png'), fullPage: false });
  const T = RC.term, C = RC.credit;
  const kt = kpis.find((k) => k.k === 'VIX / VIX3M'), kc = kpis.find((k) => k.k === 'Credito high yield');
  ok(!!kt && !!kc, `riquadri presenti (${kpis.length})`);
  ok(kt.v.startsWith(it(T.r, 2)), `rapporto ${kt.v} atteso ${it(T.r, 2)} (${T.r})`);
  ok(kt.v.includes(T.state), `stato ${T.state}`);
  ok(kt.s.includes(`VIX ${it(T.vix, 2)} / VIX3M ${it(T.v3, 2)}`), `VIX e VIX3M nel sottotitolo: ${kt.s}`);
  ok(kt.s.includes(`al ${dIT(T.date)}`), `data ${dIT(T.date)}`);
  ok(kt.s.includes(`${it(T.pct, 0)}° percentile`), `percentile atteso ${it(T.pct, 0)} (${T.pct})`);
  ok(kt.s.includes('provvisorio') === T.provisional, `provvisorio atteso ${T.provisional}`);
  ok(kc.v === sg(C.dd, 1), `distanza dal massimo ${kc.v} attesa ${sg(C.dd, 1)} (${C.dd})`);
  ok(kc.s.includes(`${sg(C.ch, 1)} in un mese`), `variazione a un mese attesa ${sg(C.ch, 1)} (${C.ch})`);
  ok(kc.s.includes(`${it(C.pct, 0)}° percentile`), `percentile del calo atteso ${it(C.pct, 0)} (${C.pct})`);
  ok(kc.s.includes(`al ${dIT(C.date)}`), `data del credito ${dIT(C.date)}`);

  // riquadro dei valori: periodi MAX, 10A e 3A, posizioni fisse lungo l'asse
  const seen = [];
  for (const [range, fr] of [['MAX', [0.03, 0.3, 0.493, 0.5, 0.52, 0.55, 0.6, 0.7, 0.8, 0.9, 0.99]], ['10A', [0.15, 0.6]], ['3A', [0.05, 0.4, 0.97, 1.0]]]) {
    await p.click(`#vxRange button[data-range="${range}"]`); await p.waitForTimeout(400);
    const box = await (await p.$('#vxChart')).boundingBox();
    // il rettangolo trasparente del puntatore: l'ultimo rect con fill transparent
    const hb = await p.$$eval('#vxChart rect[fill="transparent"]', (a) => { const r = a.at(-1).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    for (const f of fr) {
      await p.mouse.move(hb.x + 2 + f * (hb.w - 60), hb.y + hb.h * 0.85); await p.waitForTimeout(120);
      const rows = await p.$$eval('#vxTip .row', (a) => a.map((r) => [...r.children].map((x) => x.textContent.trim())));
      const d = rows[0][0], iso = `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}`, get = (k) => (rows.find((r) => r[0] === k) || [])[1];
      const e = S[iso] || (iso < '2007-01-03' ? { v3: null, r: null, dd: null } : null); seen.push(iso);
      if (!e) { ok(false, `${range} ${iso}: data non nel ricalcolo`); continue; }
      const v3 = get('VIX3M'), r = get('VIX / VIX3M'), cr = get('HYG/IEF dal massimo 12 mesi');
      const wantR = e.r == null ? '—' : `${it(e.r, 2)} ${e.r >= 1 ? 'backwardation' : 'contango'}`;
      ok(v3 != null && v3.replace(' provv.', '') === it(e.v3, 2) && (v3.includes('provv.') === (iso > RC.fredLast.vix3m || iso > RC.fredLast.vix)) && r === wantR && cr === sg(e.dd, 1), `${range} ${iso}: VIX3M ${v3} / ${it(e.v3, 2)} · R ${r} / ${wantR} · credito ${cr} / ${sg(e.dd, 1)}`);
    }
  }
  // ultima seduta (bordo destro, 3A): VIX3M provvisorio
  { const hb = await p.$$eval('#vxChart rect[fill="transparent"]', (a) => { const r = a.at(-1).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await p.mouse.move(hb.x + hb.w - 3, hb.y + hb.h * 0.85); await p.waitForTimeout(150);
    const rows = await p.$$eval('#vxTip .row', (a) => a.map((r) => [...r.children].map((x) => x.textContent.trim())));
    const g = (k) => (rows.find((r) => r[0] === k) || [])[1];
    ok(rows[0][0] === dIT(T.date) && g('VIX3M') === `${it(T.v3, 2)} provv.` && g('VIX / VIX3M') === `${it(T.r, 2)} ${T.state}` && g('HYG/IEF dal massimo 12 mesi') === sg(C.dd, 1), `ultima seduta nel grafico: ${JSON.stringify(rows.slice(-3))}`);
    seen.push(T.date);
    await p.screenshot({ path: path.join(__dirname, 'vix-tip-ultima.png') }); }
  ok(new Set(seen).size >= 10, `date distinte controllate nel grafico: ${new Set(seen).size}`);
  ok(errs.length === 0, `console senza errori (${errs.join(' | ')})`);
  await b.close();
  console.log(`\n${checks} controlli, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();

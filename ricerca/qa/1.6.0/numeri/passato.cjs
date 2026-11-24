// Nessun dato futuro: servo data/vix.json tagliato a una data passata e confronto i riquadri con il ricalcolo
// (ricalcolo.json: percentili, distanza dal massimo e variazione calcolati con la storia fino a quel giorno) e con i
// riquadri che il file intero darebbe se usasse il futuro. Uso: BASE=... NODE_PATH=$(npm root -g) node passato.cjs
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8792/';
const J = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../data/vix.json'), 'utf8'));
const RC = JSON.parse(fs.readFileSync(path.join(__dirname, 'ricalcolo.json'), 'utf8')).series;
const it = (v, d) => (v == null ? '—' : (v < 0 && Math.abs(v).toFixed(d) !== (0).toFixed(d) ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ','));
const sg = (v, d) => (v == null ? '—' : (v > 0 && Math.abs(v).toFixed(d) !== (0).toFixed(d) ? '+' : '') + it(v, d) + '%');
const dates = (x) => { const o = [x.d0]; let t = Date.parse(x.d0 + 'T00:00:00Z'); for (const c of x.gaps) { t += parseInt(c, 36) * 864e5; o.push(new Date(t).toISOString().slice(0, 10)); } return o; };
function cut(D) {
  const o = JSON.parse(JSON.stringify(J));
  for (const k of Object.keys(o.series)) {
    const s = o.series[k], d = dates(s), n = d.filter((x) => x <= D).length;
    s.cd = s.cd.slice(0, n); s.gaps = s.gaps.slice(0, n - 1); s.last = d[n - 1]; if (s.fred) s.fred = s.fred < d[n - 1] ? s.fred : d[n - 1];
  }
  const a = o.asOf; a.vix = a.spx = a.ndx = a.vix3m = a.credit = D; a.fred = a.fred3m = D;
  return o;
}
let fail = 0, n = 0;
(async () => {
  const b = await chromium.launch();
  for (const D of ['2008-11-20', '2010-05-20', '2011-08-08', '2015-08-24', '2018-02-08', '2020-03-16', '2022-10-12', '2025-04-08']) {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const body = JSON.stringify(cut(D));
    await c.route('**/data/vix.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body }));
    const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi'); await p.waitForTimeout(600);
    const k = await p.$$eval('#vxKpis .kpi', (a) => a.slice(4).map((x) => ({ v: x.querySelector('.v').textContent, s: x.querySelector('.s').textContent })));
    const e = RC[D];
    const wantT = `${it(e.r, 2)} ${e.r >= 1 ? 'backwardation' : 'contango'}`, wantTp = e.rPct == null ? null : `${it(e.rPct, 0)}° percentile`;
    const okT = k[0].v === wantT && (wantTp ? k[0].s.includes(wantTp) : !k[0].s.includes('percentile')) && !k[0].s.includes('provvisorio');
    const okC = k[1].v === sg(e.dd, 1) && k[1].s.includes(`${sg(e.ch, 1)} in un mese`) && (e.ddPct == null ? !k[1].s.includes('percentile') : k[1].s.includes(`${it(e.ddPct, 0)}° percentile`));
    n += 2; if (!okT) fail++; if (!okC) fail++;
    console.log(`${okT && okC ? 'OK  ' : 'FAIL'} ${D}: pagina [${k[0].v} | ${k[0].s}] [${k[1].v} | ${k[1].s}] · ricalcolo R ${it(e.r, 3)} pct ${it(e.rPct, 1)} · dd ${sg(e.dd, 2)} ch ${sg(e.ch, 2)} pct ${it(e.ddPct, 1)}`);
    await c.close();
  }
  await b.close();
  console.log(`${n} controlli, ${fail} falliti`); process.exit(fail ? 1 : 0);
})();

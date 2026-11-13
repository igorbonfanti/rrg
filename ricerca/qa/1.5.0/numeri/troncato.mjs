// Nessun dato futuro: l'app riceve data/vix.json tagliato a una data passata D (tutte e tre le serie) e i riquadri
// devono dare gli stessi numeri del ricalcolo sulla storia completa a quella data (ricalcolo.json → grafico[D]).
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [, , URL = 'http://127.0.0.1:8798/', RIC, VJ = '/home/user/rrg/data/vix.json'] = process.argv;
const J = JSON.parse(fs.readFileSync(VJ, 'utf8')), R = JSON.parse(fs.readFileSync(RIC, 'utf8'));
const dates = (x) => { const out = [x.d0]; let t = Date.parse(x.d0); for (const c of x.gaps) { t += parseInt(c, 36) * 864e5; out.push(new Date(t).toISOString().slice(0, 10)); } return out; };
const cut = (D) => { const x = structuredClone(J); for (const k of ['VIX', 'SPX', 'NDX']) { const s = x.series[k], d = dates(s), n = d.filter((z) => z <= D).length; s.cd = s.cd.slice(0, n); s.gaps = s.gaps.slice(0, n - 1); s.last = d[n - 1]; if (s.fred) s.fred = d[n - 1]; } x.asOf = { vix: D, fred: D, spx: D, ndx: D }; return x; };
const fx = (v, d) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ',');
const b = await chromium.launch();
let ok = 0, ko = 0;
for (const D of ['2008-10-24', '2020-03-16', '2025-04-08', '2011-08-08', '2001-09-20']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/data/vix.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cut(D)) }));
  const p = await ctx.newPage();
  await p.goto(URL + '#vix', { waitUntil: 'networkidle' });
  await p.waitForSelector('#vxKpis .kpi');
  const v = await p.$$eval('#vxKpis .kpi .v', (a) => a.map((x) => x.textContent));
  const s3 = await p.$eval('#vxKpis .kpi:nth-child(4) .s', (x) => x.textContent);
  const G = R.grafico[D];
  const exp = [fx(G.vix, 2), null, fx(G.rv, 1), (G.prem >= 0 ? '+' : '') + fx(G.prem, 1)];
  const got = [v[0], null, v[2], v[3]];
  const same = JSON.stringify(exp) === JSON.stringify(got) && s3.includes(`${fx(G.premPct, 0)}° percentile`);
  same ? ok++ : ko++;
  console.log(D, same ? 'OK' : 'KO', 'app', v.join(' / '), s3, '| ricalcolo storia completa', exp.join(' / '), fx(G.premPct, 0));
  await ctx.close();
}
await b.close();
console.log(`passano ${ok}, non passano ${ko}`);

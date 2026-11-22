// 1.12.0, regola del calo in corso (decisione dell'utente del 22/11/2026): con le chiusure di data/ath_history.json tagliate
// al 31/07/2023 la linea del tempo deve mostrare in corso il calo del 2022 (non il massimo di 52 settimane del 31/07/2023);
// al 30/06/2010 due riquadri in corso (2007 e aprile 2010). Prima della modifica fallisce (un solo riquadro, 31/07/2023).
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/regola/in-corso.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const DAY = 86400000;
function cut(H, to) {
  const out = structuredClone(H);
  for (const s of Object.values(out.series)) {
    let t = Date.parse(s.d0), k = 1;
    if (s.d0 > to) { s.gaps = ''; s.cd = s.cd.slice(0, 0); continue; }
    for (const ch of s.gaps) { t += parseInt(ch, 36) * DAY; if (new Date(t).toISOString().slice(0, 10) > to) break; k++; }
    s.gaps = s.gaps.slice(0, k - 1); s.cd = s.cd.slice(0, k);
  }
  delete out.profiles;
  return out;
}
(async () => {
  const H = await (await fetch(BASE + 'data/ath_history.json')).json();
  const b = await chromium.launch();
  for (const [to, want, meta] of [
    ['2023-07-31', [['03/01/2022', 'calo −25,4%', true]], "e quello in corso"],
    ['2010-06-30', [['09/10/2007', 'calo −56,8%', true], ['23/04/2010', 'calo −15,3%', true]], "cali ≥ 15% dell'S&P 500: i 2 in corso"],
    ['2012-03-30', [['23/04/2010', 'calo −16,0%', false], ['29/04/2011', 'calo −19,4%', false], ['09/10/2007', 'calo −56,8%', true]], "e quello in corso"],
  ]) {
    for (const [w, mob] of [[1440, false], [390, true]]) {
      const c = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob });
      await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
      const body = JSON.stringify(cut(H, to));
      await c.route('**/data/ath_history.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body }));
      const p = await c.newPage(), errs = [];
      p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      await p.goto(BASE + '#ath');
      await p.waitForSelector('#pkBody .pkep', { timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(500);
      const got = await p.evaluate(() => ({ h: [...document.querySelectorAll('#pkBody .pkep h3')].map((x) => x.textContent), meta: document.getElementById('pkMeta').textContent }));
      const tail = got.h.slice(-want.length);
      const good = want.every(([d, calo, on], k) => (tail[k] || '').includes(d) && (tail[k] || '').includes(calo) && (tail[k] || '').includes('in corso') === on);
      ok(good && got.h.length === { '2023-07-31': 5, '2010-06-30': 2, '2012-03-30': 3 }[to], `${to} ${w}px: riquadri ${got.h.join(' | ')}`);
      ok(got.meta.includes(meta), `${to} ${w}px: intestazione «${got.meta}»`);
      const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      ok(sw[0] <= sw[1] && !errs.length, `${to} ${w}px: niente scorrimento orizzontale né errori ${errs.join(' | ')}`);
      if (w === 1440) await p.locator('#pkPanel').screenshot({ path: `${__dirname}/${to}-1440.png` }).catch(() => {});
      await c.close();
    }
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();

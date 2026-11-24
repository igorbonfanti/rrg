// QA 1.13.0 (controllore indipendente): ogni vista aperta direttamente dal suo indirizzo, a 1440 e 390 px, su due versioni,
// con gli errori della console e della pagina; poi ogni file di data/ mancante a turno (404), con le viste aperte una dopo
// l'altra cambiando l'indirizzo, e il confronto tra le due versioni (errore nuovo o vista non più disegnata = rilievo).
// Uso: NODE_PATH=$(npm root -g) NEW=http://localhost:8831/ OLD=http://localhost:8832/ node viste.cjs [parte]
//   parte: "dirette", "mancanti" o niente (tutte e due). Scrive viste.json accanto allo script.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const NEW = process.env.NEW || 'http://localhost:8831/', OLD = process.env.OLD || 'http://localhost:8832/';
const PART = process.argv[2] || 'tutte';
const HASHES = ['mon', 'rrg', 'btm', 'sec', 'tit', 'idx', 'emg', 'vix', 'alr', 'ath', 'XLK', 'SOXX', 'tit-XLE', 'emg-KOSPI'];
// che cosa vuol dire «disegnata» per ogni vista (contenuto che arriva dai dati)
const DRAWN = {
  mon: '#boardTable tbody tr', rrg: '#rrg circle, #rrg path', btm: '#bm circle', sec: '#memTable tbody tr', tit: '#titPain tbody tr',
  idx: '#ixTable tbody tr', emg: '#emTable tbody tr', vix: '#vxTable tbody tr', alr: '#alertLog li', ath: '#athTable tr.athr',
};
const viewOf = (h) => (/^(XL|SOXX)/.test(h) ? 'sec' : h.split('-')[0]);
const SIZES = { 1440: { viewport: { width: 1440, height: 900 } }, 390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } };
const DATA = fs.readdirSync(path.join(__dirname, '../../../../data')).filter((f) => f.endsWith('.json')).concat(['index_members/']);

async function ctx(b, size, block) {
  const c = await b.newContext(SIZES[size]);
  await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  if (block) await c.route((u) => u.pathname.startsWith('/data/' + block) || u.pathname === '/data/' + block, (r) => r.fulfill({ status: 404, body: 'not found' }));
  return c;
}
function listen(p, errs) {
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e.message || e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });
}
async function state(p, h) {
  const v = viewOf(h);
  return p.evaluate(([v, sel]) => {
    const sec = document.getElementById('v-' + v);
    return { visible: !!sec && !sec.hidden, drawn: sel ? document.querySelectorAll(sel).length : -1, buttons: sec ? sec.querySelectorAll('button.info').length : 0,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
  }, [v, DRAWN[v]]);
}

(async () => {
  const b = await chromium.launch();
  const out = { dirette: {}, mancanti: {} };
  if (PART !== 'mancanti') {
    for (const [ver, base] of [['new', NEW], ['old', OLD]]) for (const size of ['1440', '390']) for (const h of HASHES) {
      const c = await ctx(b, size); const p = await c.newPage(); const errs = []; listen(p, errs);
      await p.goto(base + 'index.html#' + h, { waitUntil: 'load' });
      await p.waitForTimeout(h === 'ath' || h === 'vix' || h.startsWith('tit') || h.startsWith('emg') ? 3500 : 2500);
      const s = await state(p, h);
      out.dirette[`${ver} ${size} #${h}`] = { ...s, errs };
      console.log(`${ver} ${size} #${h}: visibile ${s.visible} disegnata ${s.drawn} «i» ${s.buttons} scroll ${s.sw}/${s.cw} errori ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
      await c.close();
    }
  }
  if (PART !== 'dirette') {
    for (const f of DATA) for (const [ver, base] of [['new', NEW], ['old', OLD]]) {
      const c = await ctx(b, '1440', f); const p = await c.newPage(); const errs = []; listen(p, errs);
      await p.goto(base + 'index.html#mon', { waitUntil: 'load' }); await p.waitForTimeout(2500);
      const views = {};
      for (const h of ['mon', 'rrg', 'btm', 'XLK', 'tit', 'idx', 'emg', 'vix', 'alr', 'ath']) {
        const n0 = errs.length;
        await p.evaluate((h) => { location.hash = h; }, h); await p.waitForTimeout(h === 'ath' || h === 'vix' || h === 'tit' || h === 'emg' ? 2500 : 1200);
        // un clic su un «i» visibile della vista: il riquadro deve aprirsi anche senza quel file
        const i = await p.evaluate((v) => { const s = document.getElementById('v-' + v); const btn = s && [...s.querySelectorAll('button.info')].find((x) => x.getClientRects().length); if (!btn) return null; btn.click(); const pop = document.getElementById('infopop'); const r = pop && !pop.hidden ? pop.textContent.length : 0; document.body.click(); return r; }, viewOf(h));
        views[h] = { ...(await state(p, h)), info: i, errs: errs.slice(n0).filter((e) => !/Failed to load resource/.test(e)) };
      }
      const pe = errs.filter((e) => /PAGEERROR/.test(e));
      out.mancanti[`${f} ${ver}`] = { views, pageerrors: pe };
      console.log(`senza ${f} (${ver}): ` + Object.entries(views).map(([h, s]) => `${h}:${s.visible ? '' : 'nascosta,'}${s.drawn}${s.info === 0 ? ',«i» vuoto' : ''}${s.errs.length ? ',ERR' : ''}`).join(' ') + (pe.length ? ' · ' + pe.join(' | ') : ''));
      await c.close();
    }
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, `viste-${PART}.json`), JSON.stringify(out, null, 1));
})();

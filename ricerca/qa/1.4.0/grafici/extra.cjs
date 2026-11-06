// Controlli aggiuntivi: riquadro dei valori vicino al fondo della finestra, colori calcolati e contrasto (chiaro, scuro,
// CVD), legenda contro colori disegnati, screenshot del bordo sinistro e della legenda.
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/grafici/extra.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/', OUT = path.join(__dirname, 'shots');
(async () => {
  const br = await chromium.launch();
  for (const [name, w, h, light, cvd] of [['1440-scuro', 1440, 900, false, false], ['1440-chiaro', 1440, 900, true, false], ['1440-scuro-cvd', 1440, 900, false, true], ['1440-chiaro-cvd', 1440, 900, true, true]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(({ light, cvd }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); if (cvd) localStorage.setItem('sm.cvd', 'true'); } } catch {} }, { light, cvd });
    const p = await ctx.newPage();
    await p.goto(BASE + '#emg-NIFTY50'); await p.waitForSelector('#emChart path.emloc'); await p.waitForTimeout(800);
    console.log(`\n== ${name} · cvd ${await p.evaluate(() => document.documentElement.classList.contains('cvd'))}`);
    // colori calcolati e contrasto contro lo sfondo del pannello
    const C = await p.evaluate(() => {
      const svg = document.getElementById('emChart');
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      let bgEl = svg; let bg = 'rgba(0, 0, 0, 0)'; while (bgEl && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) { bgEl = bgEl.parentElement; bg = getComputedStyle(bgEl).backgroundColor; }
      const B = rgb(bg);
      const mix = (c, a) => c.map((v, i) => v * a + B[i] * (1 - a));
      const out = { bg };
      for (const sel of ['path.emloc', 'path.emusd', 'path.br', 'path.emfx', 'path.emdl', 'path.ma', 'line.blue', 'path.trigmark', 'text.axt', 'text.pane-t']) {
        const e = svg.querySelector(sel); if (!e) continue; const cs = getComputedStyle(e);
        const col = rgb(sel.startsWith('path.trig') || sel.startsWith('text') ? cs.fill : cs.stroke).slice(0, 3), op = +cs.opacity;
        out[sel] = { col: `rgb(${col.join(',')})`, op, contrasto: +cr(op < 1 ? mix(col, op) : col, B).toFixed(2) };
      }
      for (const sel of ['rect.band', 'rect.fxcalo', 'rect.fxferma', 'rect.dlfav']) {
        const e = svg.querySelector(sel); if (!e) continue; const cs = getComputedStyle(e);
        const col = rgb(cs.fill).slice(0, 3), a = +cs.fillOpacity * +cs.opacity;
        out[sel] = { col: `rgb(${col.join(',')})`, alfa: a, contrasto_fascia_sfondo: +cr(mix(col, a), B).toFixed(2), linea_bianca_su_fascia: null };
      }
      // legenda: colori dei campioni
      out.legenda = [...document.querySelectorAll('#emLegend > span')].map((s) => { const k = s.querySelector('.kl,.kb'); const cs = getComputedStyle(k); return `${s.innerText.trim()}: ${cs.backgroundColor} op ${cs.opacity}`; });
      // contrasto tra calo e ferma (fasce) per chi distingue male rosso e verde: differenza di luminanza
      const ca = svg.querySelector('rect.fxcalo'), fe = svg.querySelector('rect.fxferma');
      if (ca && fe) { const a = getComputedStyle(ca), b = getComputedStyle(fe); out.calo_vs_ferma = +cr(mix(rgb(a.fill).slice(0, 3), +a.fillOpacity), mix(rgb(b.fill).slice(0, 3), +b.fillOpacity)).toFixed(2); }
      return out;
    });
    console.log(JSON.stringify(C, null, 1));
    // riquadro sul pannello del dollaro con il grafico in fondo alla finestra
    await p.evaluate(() => { const r = document.getElementById('emChart').getBoundingClientRect(); window.scrollBy(0, r.bottom - innerHeight + 30); });
    await p.waitForTimeout(300);
    const bb = await p.locator('#emChart').boundingBox();
    await p.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.85); await p.waitForTimeout(200);
    const T = await p.evaluate(() => { const t = document.getElementById('emTip').getBoundingClientRect(); return { top: t.top, bottom: t.bottom, ih: innerHeight, hidden: document.getElementById('emTip').hidden }; });
    console.log(`riquadro col puntatore sul pannello del dollaro a ${Math.round(bb.y + bb.height * 0.85)} px: riquadro ${Math.round(T.top)}…${Math.round(T.bottom)} su una finestra alta ${T.ih} → ${T.bottom > T.ih ? 'ESCE DI ' + Math.round(T.bottom - T.ih) + ' px' : 'dentro'}`);
    await p.screenshot({ path: path.join(OUT, `${name}-tip-fondo.png`) });
    // bordo sinistro e legenda (NIFTY50 3A: banda «ha smesso di scendere» iniziata prima del periodo)
    await p.locator('#emChart').scrollIntoViewIfNeeded(); await p.mouse.move(5, 5);
    const svgBox = await p.locator('#emChart').boundingBox();
    await p.screenshot({ path: path.join(OUT, `${name}-NIFTY50-bordo-sinistro.png`), clip: { x: svgBox.x, y: svgBox.y + svgBox.height * 0.5, width: 260, height: svgBox.height * 0.5 } });
    await p.locator('#emLegend').screenshot({ path: path.join(OUT, `${name}-legenda-NIFTY50.png`) });
    await p.goto(BASE + '#emg-EEM'); await p.waitForTimeout(800);
    await p.locator('#emLegend').screenshot({ path: path.join(OUT, `${name}-legenda-EEM.png`) });
    console.log('legenda EEM:', (await p.locator('#emLegend').innerText()).replace(/\n/g, ' | '), '· titolo pannello:', await p.locator('#emChart .pane-t').first().textContent());
    if (cvd || name === '1440-chiaro') { await p.goto(BASE + '#emg-TWN'); await p.waitForTimeout(800); await p.locator('#emChart').screenshot({ path: path.join(OUT, `${name}-TWN-3A.png`) }); }
    await ctx.close();
  }
  await br.close();
})();

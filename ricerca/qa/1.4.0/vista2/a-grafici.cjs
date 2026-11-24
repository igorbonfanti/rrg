// A. Grafici della vista 8 su computer (1440, tema chiaro): 7 indici × 3 periodi. Confronta con il ricalcolo indipendente
// (ricalcolo.py → serie complete in SERIE): bordi del periodo, base 100, bande del cambio e del dollaro, riquadro dei valori.
// Uso: SERIE=<file json> node a-grafici.cjs
const fs = require('fs');
const { chromium, SHOTS, openPage, waitEmg } = require('./lib.cjs');
const SER = JSON.parse(fs.readFileSync(process.env.SERIE, 'utf8'));
const ATT = JSON.parse(fs.readFileSync(__dirname + '/atteso.json', 'utf8'));
const DAY = 86400000, P = (d) => Date.parse(d);
const fmt = (v, d = 1) => (v == null ? '—' : (v < 0 && Math.abs(v).toFixed(d) !== (0).toFixed(d) ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ','));
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const out = { problemi: [], controlli: 0, dettagli: [] };
const bad = (m) => { out.problemi.push(m); console.log('PROBLEMA', m); };
const ok = (cond, m) => { out.controlli++; if (!cond) bad(m); return cond; };
(async () => {
  const browser = await chromium.launch();
  const width = +(process.env.W || 1440), theme = process.env.THEME || 'light';
  const { page, errs } = await openPage(browser, { width, theme });
  await waitEmg(page);
  for (const k of Object.keys(ATT.indici)) {
    await page.click(`#emTable tr[data-em="${k}"]`);
    await page.waitForTimeout(150);
    for (const R of ['3A', '10A', 'MAX']) {
      await page.click(`#emRange button[data-range="${R}"]`);
      await page.waitForTimeout(150);
      const g = await page.evaluate(() => {
        const svg = document.getElementById('emChart'), vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
        const pts = (sel) => { const p = svg.querySelector(sel); if (!p) return null; const d = p.getAttribute('d'); const m = [...d.matchAll(/([ML])([-\d.]+) ([-\d.]+)/g)].map((x) => [x[1], +x[2], +x[3]]); return m; };
        const rects = (cls) => [...svg.querySelectorAll('rect.' + cls)].map((e) => [+e.getAttribute('x'), +e.getAttribute('width'), +e.getAttribute('y'), +e.getAttribute('height')]);
        return { W: vb.width, H: vb.height, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, loc: pts('path.emloc'), usd: pts('path.emusd'), fx: pts('path.emfx'), dl: pts('path.emdl'), ma: pts('path.ma'),
          frames: rects('frame'), fxcalo: rects('fxcalo'), fxferma: rects('fxferma'), dlfav: rects('dlfav'), band: rects('band'),
          titles: [...svg.querySelectorAll('text.pane-t')].map((t) => t.textContent), years: [...svg.querySelectorAll('text.axt[text-anchor="middle"]')].map((t) => [t.textContent, +t.getAttribute('x')]),
          meta: document.getElementById('emChartMeta').textContent, legend: document.getElementById('emLegend').innerText, notes: document.getElementById('emNotes').innerText,
          title: document.getElementById('emTitle').textContent, dmeta: document.getElementById('emDMeta').textContent, pressed: [...document.querySelectorAll('#emRange button')].map((b) => b.getAttribute('aria-pressed')) };
      });
      const S = SER[k], dates = S.dates, n = dates.length, t1 = P(dates[n - 1]);
      const span = R === '3A' ? 3 : R === '10A' ? 10 : null, t0 = span ? Math.max(P(dates[0]), t1 - span * 365.25 * DAY) : P(dates[0]);
      const L = 8, PW = g.W - 64, x = (d) => L + ((P(d) - t0) / (t1 - t0)) * PW, inWin = (d) => P(d) >= t0 && P(d) <= t1;
      const tag = `${k} ${R}`;
      ok(g.pressed.join() === ['3A', '10A', 'MAX'].map((q) => String(q === R)).join(), `${tag}: pulsante del periodo non segnato`);
      ok(g.frames.length === 4, `${tag}: ${g.frames.length} cornici invece di 4`);
      // bordi del periodo: prima e ultima x della linea del prezzo
      let i0 = 0; while (i0 < n - 1 && !inWin(dates[i0])) i0++;
      const firstC = dates.findIndex((d, i) => i >= i0 && S.close[i] != null);
      ok(Math.abs(g.loc[0][1] - x(dates[firstC])) < 0.2, `${tag}: la linea del prezzo parte a x=${g.loc[0][1]} invece di ${x(dates[firstC]).toFixed(1)}`);
      ok(Math.abs(g.loc.at(-1)[1] - (L + PW)) < 0.2, `${tag}: la linea del prezzo finisce a x=${g.loc.at(-1)[1]} invece di ${L + PW}`);
      // base 100 comune
      const usdRaw = S.fx ? S.close.map((c, i) => (c != null && S.fx[i] != null ? c / S.fx[i] : null)) : null;
      let jb = -1; for (let i = i0; i < n; i++) if (S.close[i] != null && (!usdRaw || usdRaw[i] != null)) { jb = i; break; }
      if (g.usd) {
        const yl = g.loc.find((p) => Math.abs(p[1] - x(dates[jb])) < 0.11), yu = g.usd.find((p) => Math.abs(p[1] - x(dates[jb])) < 0.11);
        ok(yl && yu && Math.abs(yl[2] - yu[2]) < 0.15, `${tag}: alla data base ${dates[jb]} le due linee non coincidono (${yl && yl[2]} contro ${yu && yu[2]})`);
        if (jb > i0) ok(g.meta.includes(`base 100 al ${dIT(dates[jb])}`), `${tag}: nota della base mancante (${g.meta})`);
        else ok(!g.meta.includes('base 100 al'), `${tag}: nota della base 100 presente senza motivo (${g.meta})`);
      }
      // bande del cambio: inizio e fine di ogni tratto dentro il periodo
      if (S.fxSeries && !['HSI'].includes(k)) {
        for (const [cls, key] of [['fxcalo', 'calo'], ['fxferma', 'ferma']]) {
          const fd = S.fxSeries.dates, on = S.fxSeries[key], exp = []; let s = null, prev = null;
          fd.forEach((d, i) => { if (!inWin(d)) return; if (on[i]) { if (s == null) s = d; prev = d; } else if (s != null) { exp.push([s, prev]); s = null; } });
          if (s != null) exp.push([s, prev]);
          const got = g[cls];
          ok(got.length === exp.length, `${tag}: ${got.length} bande ${key} invece di ${exp.length}`);
          exp.forEach(([a, b], j) => { const gg = got[j]; if (!gg) return; ok(Math.abs(gg[0] - x(a)) < 0.2 && Math.abs(gg[0] + gg[1] - Math.max(x(a) + 1, x(b))) < 0.2, `${tag}: banda ${key} ${a}→${b} a x ${gg[0].toFixed(1)}-${(gg[0] + gg[1]).toFixed(1)} invece di ${x(a).toFixed(1)}-${x(b).toFixed(1)}`); });
          // le bande restano dentro la cornice
          got.forEach((gg) => ok(gg[0] >= L - 0.2 && gg[0] + gg[1] <= L + PW + 1.2, `${tag}: banda ${key} fuori dalla cornice (${gg[0]}, ${gg[1]})`));
        }
      } else ok(g.fxcalo.length + g.fxferma.length === 0, `${tag}: bande del cambio su un indice senza cambio libero`);
      // bande del dollaro favorevole
      { const Dd = SER._dollar, exp = []; let s = null, prev = null;
        Dd.dates.forEach((d, i) => { if (!inWin(d)) return; if (Dd.D[i] === 1) { if (s == null) s = d; prev = d; } else if (s != null) { exp.push([s, prev]); s = null; } });
        if (s != null) exp.push([s, prev]);
        ok(g.dlfav.length === exp.length, `${tag}: ${g.dlfav.length} bande del dollaro favorevole invece di ${exp.length}`);
        exp.forEach(([a, b], j) => { const gg = g.dlfav[j]; if (gg) ok(Math.abs(gg[0] - x(a)) < 0.2 && Math.abs(gg[0] + gg[1] - Math.max(x(a) + 1, x(b))) < 0.2, `${tag}: banda dollaro ${a}→${b} spostata`); });
        // il dollaro finisce all'ultimo dato FRED, la media dove c'è
        ok(g.dl && Math.abs(g.dl.at(-1)[1] - x(Dd.dates.at(-1))) < 0.2, `${tag}: la linea del dollaro non finisce al ${Dd.dates.at(-1)}`);
        const fm = Dd.dates.findIndex((d, i) => inWin(d) && Dd.sma[i] != null);
        ok(g.ma && Math.abs(g.ma[0][1] - x(Dd.dates[fm])) < 0.2, `${tag}: la media 200 parte a ${g.ma && g.ma[0][1]} invece di ${x(Dd.dates[fm]).toFixed(1)}`);
      }
      // linee dentro la cornice in verticale
      for (const [nm, ps, fr] of [['prezzo', g.loc, 0], ['dollari', g.usd, 0], ['cambio', g.fx, 2], ['dollaro', g.dl, 3], ['media', g.ma, 3]]) {
        if (!ps) continue; const F = g.frames[fr];
        ok(ps.every((p) => p[2] >= F[2] - 0.2 && p[2] <= F[2] + F[3] + 0.2 && p[1] >= L - 0.2 && p[1] <= L + PW + 0.2), `${tag}: la linea ${nm} esce dalla sua cornice`);
      }
      // anni sull'asse: la tacca dell'anno è al 1° gennaio
      for (const [y, xx] of g.years) ok(Math.abs(xx - x(`${y}-01-01`)) < 0.2, `${tag}: anno ${y} a x=${xx} invece di ${x(`${y}-01-01`).toFixed(1)}`);
      // riquadro dei valori: ultima seduta, 1 e 3 sedute prima, e 5 date sparse nel periodo
      const idx = [n - 1, n - 2, n - 4, ...[0.1, 0.3, 0.5, 0.7, 0.9].map((f) => i0 + Math.floor((n - 1 - i0) * f))];
      for (const i of idx) {
        const d = dates[i], xx = x(d) + (i < n - 1 ? Math.min(0.4, (x(dates[i + 1]) - x(d)) / 2) : 0);
        const cx = g.rect.left + xx * (g.rect.width / g.W), cy = g.rect.top + (g.frames[1][2] + 30) * (g.rect.height / g.H);
        await page.mouse.move(cx, cy); await page.waitForTimeout(30);
        const tip = await page.evaluate(() => { const t = document.getElementById('emTip'); return t.hidden ? null : [...t.querySelectorAll('.row')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()); });
        if (!ok(tip, `${tag}: riquadro dei valori non visibile al ${d}`)) continue;
        const get = (lab) => { const r = tip.find((s) => s.startsWith(lab)); return r ? r.slice(lab.length).trim() : undefined; };
        ok(tip[0].startsWith(dIT(d)), `${tag}: riquadro al ${tip[0]} invece di ${dIT(d)}`);
        const c = S.close[i];
        ok(get('Prezzo') === fmt(c, c >= 1000 ? 0 : c < 10 ? 3 : 2), `${tag} ${d}: prezzo ${get('Prezzo')} invece di ${fmt(c, c >= 1000 ? 0 : c < 10 ? 3 : 2)}`);
        ok(get('Sopra media 200') === (S.pct200[i] == null ? '—' : fmt(S.pct200[i]) + '%'), `${tag} ${d}: breadth ${get('Sopra media 200')} invece di ${fmt(S.pct200[i])}%`);
        if (usdRaw && k !== 'EEM') { const e = usdRaw[i] == null ? null : (usdRaw[i] / usdRaw[jb]) * 100; ok(get('In dollari (base 100)') === fmt(e, 1), `${tag} ${d}: in dollari ${get('In dollari (base 100)')} invece di ${fmt(e, 1)}`); }
        if (S.fxSeries && k !== 'HSI') {
          const cc = { CSI300: 'CNY', NIFTY50: 'INR', IBOV: 'BRL', KOSPI200: 'KRW', TWN: 'TWD' }[k], v = S.fx[i];
          const yahoo = v != null && d > S.fxSeries.fred;
          const e = v == null ? '—' : fmt(v, v < 10 ? 4 : 2) + (yahoo ? ' Yahoo, provvisorio' : '');
          ok(get(`${cc} per dollaro`) === e, `${tag} ${d}: cambio «${get(`${cc} per dollaro`)}» invece di «${e}»`);
          const L2 = { calo: 'In calo forte', ferma: 'Ha smesso di scendere', normale: 'Normale' };
          ok(get('Valuta') === (S.fxState[i] ? L2[S.fxState[i]] : '—'), `${tag} ${d}: valuta ${get('Valuta')} invece di ${S.fxState[i]}`);
        }
        ok(get('Dollaro vs emergenti') === fmt(S.dl[i], 2), `${tag} ${d}: dollaro ${get('Dollaro vs emergenti')} invece di ${fmt(S.dl[i], 2)}`);
        out.dettagli.push([tag, d, tip.join(' | ')]);
      }
      await page.mouse.move(2, 2);
      if (R === '3A' || k === 'KOSPI200') await page.locator('#emChart').screenshot({ path: `${SHOTS}a-${width}-${theme}-${k}-${R}.png` });
    }
  }
  out.errori = errs;
  fs.writeFileSync(__dirname + `/esito-a-grafici-${width}-${theme}.json`, JSON.stringify(out, null, 1));
  console.log('controlli', out.controlli, 'problemi', out.problemi.length, 'errori console', errs.length, errs.slice(0, 5));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

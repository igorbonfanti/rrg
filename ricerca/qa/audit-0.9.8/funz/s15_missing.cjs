// File di dati mancanti o rovinati: per ogni file che l'app scarica, risposta 404, JSON troncato, file vuoto e «{}».
// Per ognuno si aprono tutte le viste (dal Monitor, come al primo avvio) più il dettaglio XLU e SPX con le schede
// aperte; si controlla: nessun errore JavaScript non gestito, niente NaN/undefined/Infinity, nessuna vista vuota senza
// spiegazione, e che l'app dica che il dato manca dove serve.
// Uso: node s15_missing.cjs [desktop|phone] [dark|light] [filtro sul nome del file]
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const theme = process.argv[3] || 'dark';
const only = process.argv[4] || '';
const R = new L.Rec('s15_missing_' + prof + '_' + theme + (only ? '_' + only.replace(/\W/g, '') : ''));
const ROOT = path.join(__dirname, '..', '..', '..', '..');
const FILES = ['data/prices.json', 'data/sectors.json', 'data/breadth.json', 'config/thresholds.json', 'data/breadth_latest.json', 'data/alerts.json',
  'config/indices.json', 'data/capitulation.json', 'data/indices.json', 'data/indices_more.json', 'data/sector_members.json', 'data/prices_global.json',
  'data/prices_macro.json', 'version.json'].filter((f) => f.includes(only));
const REQUIRED = new Set(['data/prices.json', 'data/sectors.json', 'data/breadth.json', 'config/thresholds.json']);
const MSG = /non disponibil|non arrivat|mancan|Impossibile caricare|non è disponibile|non sono disponibil/i;
(async () => {
  const b = await L.launch();
  for (const file of FILES) {
    const real = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const mode of ['404', 'troncato', 'vuoto', '{}']) {
      const body = mode === 'troncato' ? real.slice(0, Math.min(400, Math.floor(real.length / 2))) : mode === 'vuoto' ? '' : '{}';
      const o = await L.open(b, prof, { theme, expectFail: true });
      await o.ctx.route(new RegExp('/' + file.replace(/[.]/g, '\\.') + '(\\?|$)'), (r) => mode === '404' ? r.fulfill({ status: 404, body: 'Not Found' }) : r.fulfill({ status: 200, contentType: 'application/json', body }));
      const page = o.page;
      const tag = `${prof}/${theme} ${file} (${mode})`;
      await L.goto(page, 'mon', 1800);
      const problems = [], msgs = [];
      const visText = () => page.evaluate(() => { const v = [...document.querySelectorAll('section.view')].find((s) => !s.hidden); return v ? [v.id, v.innerText.replace(/\s+/g, ' ')] : ['', '']; });
      if (REQUIRED.has(file)) {
        const [, t] = await visText();
        R.add('D1', 'dati mancanti', `${tag}: messaggio «Impossibile caricare i dati» al posto del Monitor`, /Impossibile caricare i dati/.test(t) && !/NaN|undefined/.test(t), t.slice(0, 200));
      } else {
        for (const v of ['mon', 'rrg', 'btm', 'sec', 'alr', 'idx', 'tit']) {
          const tab = await page.$('#tab-' + v);
          if (!tab || !(await tab.isVisible())) { msgs.push(`${v}: scheda nascosta`); continue; }
          await tab.click(); await page.waitForTimeout(v === 'idx' || v === 'tit' ? 3000 : 900);
          if (v === 'sec' || v === 'idx') {
            for (const id of ['secEpiBox', 'secCap', 'ixEpiBox', 'ixCap']) await page.evaluate((id) => { const d = document.getElementById(id); if (d && !d.closest('[hidden]')) d.open = true; }, id);
            await page.waitForTimeout(1200);
          }
          const [id, t] = await visText();
          const bad = await L.badText(page, '#' + id);
          if (bad.length) problems.push(`${v}: ${bad.join(' / ')}`);
          if (t.length < 40) problems.push(`${v}: vista vuota («${t}»)`);
          if (/…\s*$|caricamento…/.test(t) && !MSG.test(t)) problems.push(`${v}: resta «caricamento…»`);
          const m = t.match(new RegExp('.{0,60}(' + MSG.source + ').{0,60}', 'i'));
          if (m) msgs.push(`${v}: «${m[0].trim()}»`);
        }
        const uncaught = o.log.filter((l) => /pageerror|UNHANDLED/.test(l));
        R.add('D2', 'dati mancanti', `${tag}: nessun errore JavaScript non gestito`, !uncaught.length, uncaught.slice(0, 3).join(' | '));
        R.add('D3', 'dati mancanti', `${tag}: niente NaN/undefined, nessuna vista vuota o in caricamento per sempre`, !problems.length, problems.join(' | ').slice(0, 500));
        // dove il file serve a una parte visibile, l'app deve dire che il dato manca
        const needs = { 'data/capitulation.json': /(sec|idx):/, 'data/indices.json': /idx:/, 'data/indices_more.json': /idx:/, 'data/sector_members.json': /tit:/,
          'data/breadth_latest.json': /sec:/, 'data/prices_global.json': /rrg:/, 'data/prices_macro.json': /rrg:/, 'data/alerts.json': /alr:/ }[file];
        if (needs && mode !== '{}') R.add('D4', 'dati mancanti', `${tag}: l'app dice che il dato manca`, msgs.some((m) => needs.test(m)), msgs.join(' | ').slice(0, 400) || 'nessun messaggio');
        if (file === 'config/indices.json' && mode !== '{}') R.add('D4', 'dati mancanti', `${tag}: scheda Indici nascosta e #idx non porta a una pagina vuota`, msgs.some((m) => /idx: scheda nascosta/.test(m)), msgs.join(' | '));
      }
      await L.shot(page, `d-${prof}-${file.replace(/\W/g, '_')}-${mode.replace(/\W/g, '_') || 'obj'}`, true);
      await o.ctx.close();
    }
  }
  R.save();
  await b.close();
})();

// G. Testi del dettaglio per ogni indice e periodo: titoli dei pannelli, nota sotto il grafico, note, legenda.
const fs = require('fs');
const { chromium, openPage, waitEmg } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const w of [1440, 390]) {
    const { page } = await openPage(b, { width: w, hash: '#emg' }); await waitEmg(page);
    for (const k of ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM']) {
      await page.click(`#emTable tr[data-em="${k}"]`); await page.waitForTimeout(150);
      for (const R of ['3A', 'MAX']) {
        await page.click(`#emRange button[data-range="${R}"]`); await page.waitForTimeout(150);
        out[`${w} ${k} ${R}`] = await page.evaluate(() => ({ panes: [...document.querySelectorAll('#emChart text.pane-t')].map((t) => t.textContent), other: [...document.querySelectorAll('#emChart text.axt')].filter((t) => t.textContent.length > 8).map((t) => t.textContent),
          meta: document.getElementById('emChartMeta').parentElement.innerText, dmeta: document.getElementById('emDMeta').textContent, notes: document.getElementById('emNotes').innerText, legend: document.getElementById('emLegend').innerText.replace(/\n/g, ' | '), open: document.getElementById('emOpenIx').textContent }));
      }
    }
  }
  fs.writeFileSync(__dirname + '/esito-g-testi-dettaglio.json', JSON.stringify(out, null, 1));
  for (const [k, v] of Object.entries(out)) if (/1440 .* (3A|MAX)/.test(k) && /(HSI|EEM|CSI300) MAX|EEM 3A|HSI 3A/.test(k) || /390 (EEM|HSI) 3A/.test(k)) console.log(k, JSON.stringify(v));
  await b.close();
})();

// Scarica le risposte grezze di Yahoo (chart v8, 1d) e le salva in una cache fuori dal repository.
// Uso: node scarica.mjs <cacheDir> <range> SIMBOLO...   (un file già presente non si riscarica)
import fs from 'node:fs';
import path from 'node:path';
const [cache, range, ...syms] = process.argv.slice(2);
fs.mkdirSync(cache, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const s of syms) {
  const f = path.join(cache, `${s.replace(/[^A-Za-z0-9._=-]/g, '_')}_${range}.json`);
  if (fs.existsSync(f)) continue;
  for (let a = 0; a < 4; a++) {
    const url = `https://query${1 + (a % 2)}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=1d&includeAdjustedClose=true`;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!j.chart?.result?.[0]?.timestamp) throw new Error('vuoto');
      fs.writeFileSync(f, JSON.stringify(j.chart.result[0]));
      console.log('ok', s, j.chart.result[0].timestamp.length);
      break;
    } catch (e) { console.log('err', s, e.message); await sleep(1000 * 2 ** a); }
  }
  await sleep(200);
}

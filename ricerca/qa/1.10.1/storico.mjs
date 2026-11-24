// Controllo 1.10.1: lo storico del grafico (data/ath_history.json) di GOLD e SILVER è la serie di GC=F e SI=F di Yahoo
// (cache scaricata da ricalcolo.py). Uso: node ricerca/qa/1.10.1/storico.mjs <cartella-cache>
import fs from 'node:fs';
import { decodeDates, deltaDecode } from '../../../js/indexdata.js';
const C = process.argv[2];
const H = JSON.parse(fs.readFileSync('data/ath_history.json', 'utf-8')).series;
const ny = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
for (const [id, sym] of [['GOLD', 'GC=F'], ['SILVER', 'SI=F'], ['GOLD', 'GLD'], ['SILVER', 'SLV']]) {
  const r = JSON.parse(fs.readFileSync(`${C}/${sym.replace('=', '_')}.json`, 'utf-8')).chart.result[0];
  const y = new Map(); r.timestamp.forEach((t, i) => { const c = r.indicators.quote[0].close[i]; if (c != null) y.set(ny.format(t * 1000), c); });
  const d = decodeDates(H[id].d0, H[id].gaps), v = deltaDecode(H[id].cd, H[id].ps || 1);
  let n = 0, bad = 0, miss = 0, maxd = 0;
  d.forEach((dd, i) => { const c = y.get(dd); if (c == null) { miss++; return; } n++; const e = Math.abs(v[i] / c - 1); maxd = Math.max(maxd, e); if (e > 1e-4) bad++; });
  console.log(`${id} contro ${sym}: ${d.length} sedute (${d[0]}…${d.at(-1)}), confrontate ${n}, diverse oltre 0,01% ${bad}, assenti in Yahoo ${miss}, scarto massimo ${(maxd * 100).toFixed(4)}%`);
}

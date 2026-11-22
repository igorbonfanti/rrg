// Casi limite di js/peaks.js (1.12.0) sulle chiusure vere di data/ath_history.json tagliate a date del passato, o con dati
// aggiunti. Per ogni taglio: episodi mostrati e controlli (nessun doppione, nessun massimo «confermato» dopo l'ultima seduta,
// il calo in corso dell'S&P 500 è quello giusto). Uso: node ricerca/qa/1.12.0/numeri-codice/casi-limite.mjs
import fs from 'node:fs';
import { timeline, cyclePeaks, clean } from '../../../../js/peaks.js';
import { decodeDates, deltaDecode } from '../../../../js/indexdata.js';

const H = JSON.parse(fs.readFileSync(new URL('../../../../data/ath_history.json', import.meta.url)));
const ALL = Object.fromEntries(Object.entries(H.series).map(([id, h]) => [id, { dates: decodeDates(h.d0, h.gaps), close: deltaDecode(h.cd, h.ps) }]));
const ids = Object.keys(ALL);
const cut = (to) => Object.fromEntries(ids.map((id) => { const s = ALL[id], k = s.dates.filter((d) => d <= to).length; return [id, { dates: s.dates.slice(0, k), close: s.close.slice(0, k) }]; }));
let bad = 0;
const say = (c, m) => { if (!c) { bad++; console.log('  PROBLEMA:', m); } };
function show(label, ser) {
  const T = timeline(ser, ids);
  console.log(`\n${label} (ultima seduta ${T.asOf})`);
  for (const e of T.episodes) console.log(`  ${e.ongoing ? 'in corso' : 'concluso'} ${e.peak} calo ${e.ddPct}`);
  const peaks = T.episodes.map((e) => e.peak);
  say(new Set(peaks).size === peaks.length, `episodi doppi: ${peaks}`);
  // massimi dei mercati: la conferma (calo ≥ 20%) deve essere entro l'ultima seduta del mercato
  for (const e of T.episodes) for (const [id, m] of Object.entries(e.markets)) if (m.status === 'peak') say(m.date <= T.asOf, `${e.peak} ${id}: massimo dopo l'ultima seduta`);
  // il calo più profondo non concluso dell'S&P 500 (≥ 15%) deve comparire
  const A = clean(ser.SPX.dates, ser.SPX.close), open = cyclePeaks(A, 15).filter((p) => p.ongoing);
  for (const p of open) say(peaks.includes(p.date), `calo dell'S&P 500 dal ${p.date} (${p.ddPct}%, non ancora recuperato) assente dalla linea del tempo`);
  return T;
}
// 1. oggi
show('Oggi', ALL);
// 2. tagli storici: durante il calo, nel recupero con nuovi massimi di 52 settimane sotto il vecchio massimo, al nuovo massimo
for (const to of ['2008-03-31', '2009-06-30', '2010-06-30', '2012-03-30', '2013-03-14', '2018-12-24', '2019-04-30', '2020-03-23', '2020-08-14', '2022-10-12', '2023-07-31', '2023-12-29', '2024-01-19', '2025-04-08', '2025-06-27', '2026-10-06']) show(`Taglio al ${to}`, cut(to));
// 3. S&P 500 a un nuovo massimo all'ultima seduta
{ const s = structuredClone(ALL); const L = s.SPX.close.length; s.SPX.dates.push('2026-11-23'); s.SPX.close.push(Math.max(...s.SPX.close) * 1.01); for (const id of ids) if (id !== 'SPX') { s[id].dates.push('2026-11-23'); s[id].close.push(s[id].close.at(-1)); }
  const T = show('Nuovo massimo dell\'S&P 500 all\'ultima seduta', s); const e = T.episodes.at(-1); console.log('  in corso:', e.peak, 'ddPct', e.ddPct, 'anchor', JSON.stringify(e.markets.SPX)); void L; }
// 4. calo in corso oltre il 15% (S&P 500 −20% dal massimo del 06/10/2026)
{ const s = structuredClone(ALL); const top = s.SPX.close[s.SPX.dates.indexOf('2026-10-06')]; for (const [d, f] of [['2026-11-23', 0.84], ['2026-11-24', 0.8]]) { s.SPX.dates.push(d); s.SPX.close.push(top * f); }
  show('Calo in corso oltre il 15%', s); }

// Revisione indipendente 1.3.4: scarto tra la breadth a 200 sedute del Nasdaq-100 con i membri d'epoca (quella
// pubblicata in data/indices.json) e quella con i membri di oggi (data/index_members/NDX.json).
// Regola di conteggio presa da countDay/sma di scripts/fetch_indices.js e breadth_for di scripts/backfill_indices.py:
//  - denominatore: membri con l'ultima chiusura al massimo STALE giorni prima della data (app: 5);
//  - numeratore: chiusura > media semplice delle ultime 200 chiusure; un titolo con meno di 200 chiusure è nel
//    denominatore ma non «sopra» (regola «app»). La regola «vecchia» lo toglie dal denominatore.
// Uso: node ricalcolo_bias.mjs [cartellaPrezzi] [stale] [clean]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PX = process.argv[2] || path.join(ROOT, 'ricerca/qa/1.3.4/prezzi');
const STALE = +(process.argv[3] || 5);
const CLEAN = process.argv[4] === 'clean';
const { indexSeries } = await import(path.join(ROOT, 'js/indexdata.js'));
const clean = CLEAN ? (await import(path.join(ROOT, 'scripts/fetch_indices.js'))).clean : null;

const ndx = indexSeries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/indices.json'), 'utf8')).series.NDX);
const tickers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/index_members/NDX.json'), 'utf8')).tickers;

// date: il 15 di gennaio, aprile, luglio, ottobre, o l'ultima seduta prima (non prima dell'8), con breadth d'epoca
const dates = [];
for (let y = 2008; y <= 2026; y++) for (const m of ['01', '04', '07', '10']) {
  let k = -1;
  for (let i = 0; i < ndx.dates.length; i++) if (ndx.dates[i] <= `${y}-${m}-15`) k = i; else break;
  if (k >= 0 && ndx.dates[k] >= `${y}-${m}-08` && ndx.pct200[k] != null) dates.push(k);
}

const px = {};
for (const t of tickers) {
  let p = JSON.parse(fs.readFileSync(path.join(PX, t + '.json'), 'utf8'));
  if (clean) p = clean(p.dates, p.close);
  px[t] = p;
}
const dayDiff = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8))) / 864e5);

function breadth(d, rule) {
  let den = 0, up = 0, short = 0;
  for (const t of tickers) {
    const { dates: pd, close: pc } = px[t];
    let j = -1;
    for (let i = pd.length - 1; i >= 0; i--) if (pd[i] <= d) { j = i; break; }
    if (j < 0 || dayDiff(pd[j], d) > STALE) continue;
    if (j < 199) { short++; if (rule === 'vecchia') continue; den++; continue; }
    den++;
    let s = 0;
    for (let i = j - 199; i <= j; i++) s += pc[i];
    if (pc[j] > s / 200) up++;
  }
  return { pct: (100 * up) / den, den, short };
}

const median = (a) => { const s = [...a].sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const r1 = (x) => Math.round(x * 10) / 10;
const out = {};
for (const rule of ['app', 'vecchia']) {
  const rows = dates.map((k) => {
    const d = ndx.dates[k], b = breadth(d, rule), ep = ndx.pct200[k];
    return { date: d, epoca: ep, oggi: b.pct, den: b.den, short: b.short, scarto: b.pct - ep };
  });
  const sc = rows.map((r) => r.scarto), low = rows.filter((r) => r.epoca < 20);
  // anche con le righe arrotondate a 0,1 prima della media (come una tabella pubblicata)
  const scR = rows.map((r) => r1(r1(r.oggi) - r1(r.epoca)));
  out[rule] = {
    date: rows.length, sotto20: low.length, dateSotto20: low.map((r) => r.date),
    media: r1(sc.reduce((a, b) => a + b, 0) / sc.length), mediana: r1(median(sc)),
    min: r1(Math.min(...sc)), max: r1(Math.max(...sc)),
    mediaSotto20: r1(low.reduce((a, r) => a + r.scarto, 0) / low.length),
    daRigheArrotondate: { media: r1(scR.reduce((a, b) => a + b, 0) / scR.length), mediana: r1(median(scR)), min: Math.min(...scR), max: Math.max(...scR),
      mediaSotto20: r1(low.map((r) => r1(r1(r.oggi) - r1(r.epoca))).reduce((a, b) => a + b, 0) / low.length) },
    righe: rows.map((r) => ({ ...r, epoca: r1(r.epoca), oggi: r1(r.oggi), scarto: r1(r.scarto) })),
  };
}
const tag = `${path.basename(PX)}_stale${STALE}${CLEAN ? '_clean' : ''}`;
fs.writeFileSync(path.join(ROOT, `ricerca/qa/1.3.4/ricalcolo_${tag}.json`), JSON.stringify(out, null, 1) + '\n');
for (const rule of ['app', 'vecchia']) { const { righe, ...s } = out[rule]; console.log(rule, JSON.stringify(s)); }

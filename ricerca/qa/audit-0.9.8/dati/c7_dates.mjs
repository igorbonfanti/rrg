// C7. Date dei file: ogni file all'ultima seduta giusta, nessuna seduta inventata o mancante.
// Confronta le date dei file con i calendari di js/calendar.js (NYSE, Borsa Italiana) e con un calendario indipendente:
// le sedute di SPY (dal 2004) e di FTSEMIB.MI su Yahoo, scaricate da c1_prices.py / qui (cache in $QA98/yahoo).
// uso: node c7_dates.mjs
import fs from 'node:fs';
import { NYSE, MILAN } from '../../../../js/calendar.js';
import { decodeDates } from '../../../../js/indexdata.js';

const R = process.env.RRG || '/home/user/rrg';
const W = process.env.QA98 || '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa98';
const load = (f) => JSON.parse(fs.readFileSync(`${R}/data/${f}`, 'utf-8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function yahooDates(sym, period1 = 1072915200) {
  const p = `${W}/yahoo/${encodeURIComponent(sym)}__dates.json`;
  let j;
  if (fs.existsSync(p)) j = JSON.parse(fs.readFileSync(p, 'utf-8'));
  else {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${period1}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;
    j = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor qa)' } })).json();
    fs.writeFileSync(p, JSON.stringify(j)); await sleep(500);
  }
  const r = j.chart.result[0], off = r.meta.gmtoffset || 0, q = r.indicators.quote[0];
  return r.timestamp.map((t, i) => (q.close[i] == null ? null : new Date((t + off) * 1000).toISOString().slice(0, 10))).filter(Boolean);
}
const days = (from, to) => { const out = []; for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10)); return out; };
const diff = (a, b) => { const B = new Set(b); return a.filter((x) => !B.has(x)); };

// 1. Calendario NYSE di calendar.js contro le sedute vere di SPY (Yahoo) dal 2004
const spy = await yahooDates('SPY');
const today = new Date().toISOString().slice(0, 10);
const cal = days('2004-01-02', spy.at(-1)).filter((d) => NYSE.isTradingDay(d));
console.log('NYSE (js/calendar.js) contro SPY su Yahoo, 2004 →', spy.at(-1));
console.log('  sedute del calendario senza barra SPY:', diff(cal, spy));
console.log('  barre SPY in giorni che il calendario dà chiusi:', diff(spy, cal));
// 2. File USA: date contro SPY
for (const [f, D] of [['prices.json', load('prices.json').dates], ['prices_macro.json', load('prices_macro.json').dates], ['sectors.json', load('sectors.json').dates], ['breadth.json', load('breadth.json').dates]]) {
  const s = spy.filter((d) => d >= D[0] && d <= D.at(-1));
  console.log(`${f}: ${D.length} date ${D[0]} → ${D.at(-1)} | sedute SPY mancanti: ${JSON.stringify(diff(s, D))} | date in più: ${JSON.stringify(diff(D, s))} | date non NYSE per calendar.js: ${JSON.stringify(D.filter((d) => !NYSE.isTradingDay(d)))}`);
}
// sector_members, capitulation SPX/settori
const sm = load('sector_members.json');
console.log('sector_members.json: asOf', sm.asOf, 'ultima data', sm.dates.at(-1));
const cap = load('capitulation.json');
for (const k of ['SPX', 'XLK', 'XLU']) {
  const D = decodeDates(cap.series[k].d0, cap.series[k].gaps), s = spy.filter((d) => d >= D[0] && d <= D.at(-1));
  console.log(`capitulation ${k}: ${D[0]} → ${D.at(-1)} | sedute SPY mancanti ${JSON.stringify(diff(s, D).slice(0, 10))} (${diff(s, D).length}) | in più ${JSON.stringify(diff(D, s))}`);
}
// 3. Borsa Italiana: calendar.js contro FTSEMIB.MI e contro il file globale
const mib = await yahooDates('FTSEMIB.MI');
const G = load('prices_global.json');
const mcal = days(G.dates[0], G.dates.at(-1)).filter((d) => MILAN.isTradingDay(d));
const m5 = mib.filter((d) => d >= G.dates[0] && d <= G.dates.at(-1));
console.log('\nBorsa Italiana (calendar.js) contro FTSEMIB.MI su Yahoo, stesso periodo del file globale');
console.log('  sedute del calendario senza barra FTSEMIB:', diff(mcal, m5));
console.log('  barre FTSEMIB in giorni chiusi per il calendario:', diff(m5, mcal));
console.log(`prices_global.json: ${G.dates.length} date ${G.dates[0]} → ${G.asOf} | sedute di Milano (calendar.js) mancanti: ${JSON.stringify(diff(mcal, G.dates))} | date fuori calendario: ${JSON.stringify(diff(G.dates, mcal))}`);
// 4. Ultima seduta attesa all'ora di generazione di ogni file
for (const f of ['prices.json', 'prices_global.json', 'prices_macro.json', 'breadth.json', 'sectors.json', 'capitulation.json', 'indices.json']) {
  const x = load(f), gen = new Date(x.generated);
  const exp = f === 'prices_global.json' ? MILAN.expectedSession(gen) : NYSE.expectedSession(gen);
  console.log(`${f}: generato ${x.generated}, asOf ${x.asOf}, seduta attesa (${f === 'prices_global.json' ? 'Milano' : 'NYSE'}) ${exp}${x.asOf === exp ? '' : '  <<< diverso'}`);
}
// 5. Indici: ultima data del prezzo e della breadth di ciascuno
console.log('\nIndici: ultima data del prezzo e della breadth');
for (const f of ['indices.json', 'indices_more.json']) {
  const S = load(f).series;
  for (const [k, x] of Object.entries(S)) {
    const D = decodeDates(x.d0, x.gaps), m = x.d200.length, lastB = D[x.b0 + m - 1];
    const cs = cap.series[k] ? decodeDates(cap.series[k].d0, cap.series[k].gaps).at(-1) : '—';
    console.log(`  ${k.padEnd(9)} ${x.symbol.padEnd(11)} prezzo ${D.at(-1)}  breadth ${lastB}  cali forti ${cs}`);
  }
}

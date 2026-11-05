/*
 * ora_chiusura.mjs — a che ora corrisponde la chiusura giornaliera di Yahoo per EURUSD=X e DX-Y.NYB, con la data corretta.
 * Per ogni barra giornaliera (data nel fuso della borsa) cerca la barra oraria la cui chiusura è più vicina, tra le 48 ore
 * che vanno dall'inizio del giorno precedente alla fine del giorno stesso, e ne conta l'ora (ora di Londra / New York).
 * Uso: node ricerca/qa/date-barre/ora_chiusura.mjs
 */
import { parse } from '../../../scripts/lib/yahoo.js';
const get = async (sym, q) => (await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?${q}`, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor qa)' } })).json()).chart.result[0];
for (const sym of ['EURUSD=X', 'DX-Y.NYB']) {
  const d = parse(await get(sym, 'range=3mo&interval=1d'));
  const h = await get(sym, 'range=3mo&interval=1h');
  const tz = h.meta.exchangeTimezoneName;
  const ts = h.timestamp, c = h.indicators.quote[0].close;
  const day = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(t * 1000);
  const hr = (t) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(t * 1000);
  // per ogni ora candidata (giorno prima o stesso giorno, ora locale della barra oraria) la differenza mediana
  const by = {};
  const prevDay = (x) => new Date(Date.parse(x) - 864e5).toISOString().slice(0, 10);
  const idx = new Map(d.dates.map((x, i) => [x, i]));
  for (let k = 0; k < ts.length; k++) {
    if (c[k] == null) continue;
    const dk = day(ts[k]);
    for (const [lab, target] of [['stesso giorno', dk], ['giorno prima', null]]) {
      let i = idx.get(target);
      if (target === null) { const nx = new Date(Date.parse(dk) + 864e5).toISOString().slice(0, 10); i = idx.get(nx); }
      if (i == null || i === d.dates.length - 1) continue;
      const key = `${lab} ${hr(ts[k])}:00`;
      (by[key] ||= []).push(Math.abs(c[k] / d.close[i] - 1) * 100);
    }
  }
  const med = Object.entries(by).filter(([, v]) => v.length >= 20).map(([k, v]) => [k, v.sort((a, b) => a - b)[v.length >> 1], v.length]).sort((a, b) => a[1] - b[1]);
  console.log(sym, tz, 'ore (inizio della barra oraria) con la differenza mediana più piccola rispetto alla chiusura giornaliera, in %:');
  for (const [k, m, n] of med.slice(0, 4)) console.log(`  ${k}  ${m.toFixed(4)}%  (${n} giorni)`);
}

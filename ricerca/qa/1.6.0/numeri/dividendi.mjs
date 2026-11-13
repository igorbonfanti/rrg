// Yahoo riscrive le chiusure rettificate a ogni dividendo: cambia la distanza dal massimo o la variazione a un mese
// che l'app mostra? Prova sui dati: per ogni seduta t ricostruisco HYG e IEF «come li avrebbe dati Yahoo il giorno t»
// (chiusura × fattori dei soli dividendi con data di stacco ≤ t) e confronto distanza dal massimo (252) e variazione
// (21) con quelle calcolate sulle chiusure rettificate di oggi. Uso: node dividendi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SRC, ddAt, chAt } from './lib.mjs';
const nyDate = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts * 1000));
function load(f) {
  const r = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')).chart.result[0];
  const d = r.timestamp.map(nyDate), c = r.indicators.quote[0].close, a = r.indicators.adjclose[0].adjclose;
  const div = new Map(Object.values((r.events && r.events.dividends) || {}).map((x) => [nyDate(x.date), x.amount]));
  const split = Object.values((r.events && r.events.splits) || {});
  return { d, c, a, div, split };
}
function check(f) {
  const s = load(f);
  // 1) il rapporto adjclose/close cambia solo nei giorni di stacco?
  let jumps = 0, offDiv = [];
  for (let i = 1; i < s.d.length; i++) {
    const f0 = s.a[i - 1] / s.c[i - 1], f1 = s.a[i] / s.c[i];
    if (Math.abs(f1 / f0 - 1) > 2e-5) { jumps++; if (!s.div.has(s.d[i])) offDiv.push([s.d[i], f1 / f0 - 1]); }
  }
  // 2) fattore di ogni dividendo come lo calcola Yahoo: 1 − div / chiusura del giorno prima; confronto con il salto
  let maxErr = 0;
  for (let i = 1; i < s.d.length; i++) if (s.div.has(s.d[i])) { const k = 1 - s.div.get(s.d[i]) / s.c[i - 1], j = (s.a[i - 1] / s.c[i - 1]) / (s.a[i] / s.c[i]); maxErr = Math.max(maxErr, Math.abs(k / j - 1)); }
  return { s, jumps, divN: s.div.size, offDiv: offDiv.slice(0, 5), offDivN: offDiv.length, splits: s.split.length, factorErr: maxErr };
}
const H = check('y_HYG.json'), I = check('y_IEF.json');
console.log('HYG', { jumps: H.jumps, div: H.divN, offDivN: H.offDivN, offDiv: H.offDiv, splits: H.splits, factorErr: H.factorErr });
console.log('IEF', { jumps: I.jumps, div: I.divN, offDivN: I.offDivN, offDiv: I.offDiv, splits: I.splits, factorErr: I.factorErr });

// 3) serie «come allora»: per la seduta t, chiusura(s) × Π fattori dei dividendi con stacco in (s, t]
function pit(s, upto) { // ritorna Map data -> valore rettificato con i soli dividendi fino a upto
  const n = s.d.findLastIndex((x) => x <= upto), out = new Array(n + 1);
  let k = 1;
  for (let i = n; i >= 0; i--) { out[i] = s.c[i] * k; if (s.div.has(s.d[i]) && i > 0) k *= 1 - s.div.get(s.d[i]) / s.c[i - 1]; }
  return new Map(s.d.slice(0, n + 1).map((x, i) => [x, out[i]]));
}
const gspc = JSON.parse(fs.readFileSync(path.join(SRC, 'y_%5EGSPC.json'), 'utf8')).chart.result[0].timestamp.map(nyDate);
const hA = new Map(H.s.d.map((x, i) => [x, H.s.a[i]])), iA = new Map(I.s.d.map((x, i) => [x, I.s.a[i]]));
const today = gspc.map((x) => (hA.has(x) && iA.has(x) ? hA.get(x) / iA.get(x) : null));
// date di prova: tutte le sedute dal 2008-06 (una ogni 5, più le ultime 60) per tenere i tempi bassi
let maxDD = 0, maxCH = 0, n = 0, worst = null;
const idx = gspc.map((_, i) => i).filter((i) => gspc[i] >= '2008-06-01' && (i % 5 === 0 || i >= gspc.length - 60));
for (const t of idx) {
  const d = gspc[t], hp = pit(H.s, d), ip = pit(I.s, d);
  const then = gspc.slice(0, t + 1).map((x) => (hp.has(x) && ip.has(x) ? hp.get(x) / ip.get(x) : null));
  const a = ddAt(then), b = ddAt(today.slice(0, t + 1)), c1 = chAt(then), c2 = chAt(today.slice(0, t + 1));
  if (a == null) continue;
  n++;
  if (Math.abs(a - b) > maxDD) { maxDD = Math.abs(a - b); worst = [d, a, b]; }
  maxCH = Math.max(maxCH, Math.abs(c1 - c2));
}
console.log({ sedute: n, maxDiffDistanzaPunti: maxDD, worst, maxDiffVariazionePunti: maxCH });
// 4) e il livello? il rapporto «come allora» e quello di oggi differiscono (è il livello che Yahoo riscrive)
const h0 = pit(H.s, '2016-01-04'), i0 = pit(I.s, '2016-01-04');
console.log('livello 2016-01-04: come allora', (h0.get('2016-01-04') / i0.get('2016-01-04')).toFixed(5), 'oggi', today[gspc.indexOf('2016-01-04')].toFixed(5));

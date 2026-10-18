// Quanto resta in allerta la scheda «Cali forti» nei mercati orso lunghi e nei crolli rapidi.
// Legge data/capitulation.json dell'app con il preset di Rea (−7%, 5 sedute, CAP_DEFAULT) e, per ogni serie e periodo,
// conta episodi e sedute in allerta nei 12 mesi (252 sedute) dal primo episodio del periodo.
// Uso: node ricerca/quant-rea/script/capitolazione_persistenza.mjs   (dalla cartella del progetto)
import fs from 'node:fs';
import { capSeries, capAnalysis } from '../../../js/capitulation.js';

const j = JSON.parse(fs.readFileSync(new URL('../../../data/capitulation.json', import.meta.url)));
const PER = { '2007-2009': ['2007-07-01', '2009-06-30'], '2020': ['2020-02-15', '2020-12-31'], '2022': ['2022-01-01', '2022-12-31'], 'apr 2025': ['2025-03-15', '2025-12-31'] };
const med = (v) => { v = [...v].sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const pool = {};
console.log(`dati al ${j.asOf}\n`);
console.log('serie     ' + Object.keys(PER).map((p) => p.padEnd(22)).join(''));
for (const k of Object.keys(j.series)) {
  const s = capSeries(j.series[k]), a = capAnalysis(s, {});
  const cells = Object.entries(PER).map(([p, [d0, d1]]) => {
    if (s.dates[a.from] > d1) return '—'; // storia troppo corta: soglia non ancora calcolabile
    const eps = a.episodes.filter((e) => s.dates[e.start] >= d0 && s.dates[e.start] <= d1);
    if (!eps.length) return s.dates[a.from] > d0 ? `0 (dal ${s.dates[a.from]})` : '0';
    const i0 = eps[0].start;
    let on = 0;
    for (let i = i0; i < Math.min(s.dates.length, i0 + 252); i++) if (a.on[i]) on++;
    (pool[p] ??= []).push(on);
    return `${eps.length} ep., ${on} sed.${s.dates[a.from] > d0 ? ` (dal ${s.dates[a.from]})` : ''}`;
  });
  console.log(k.padEnd(10) + cells.map((c) => c.padEnd(22)).join(''));
}
console.log('\nsedute in allerta nei 12 mesi dal primo episodio, tra le serie con almeno un episodio:');
for (const [p, v] of Object.entries(pool)) console.log(`  ${p.padEnd(10)} ${String(v.length).padStart(2)} serie · mediana ${med(v)} · da ${Math.min(...v)} a ${Math.max(...v)}`);

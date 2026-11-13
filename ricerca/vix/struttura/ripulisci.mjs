// Toglie dai risultati salvati nel repository (pubblico) i LIVELLI delle serie di terzi con licenza restrittiva:
// HY OAS e IG OAS di ICE (FRED «Pre-approval required») e gli spread di Moody's (BAA10Y, AAA10Y, Baa−Aaa: nota che ne
// vieta la riproduzione). Restano correlazioni, percentili e variazioni, che non permettono di ricostruire le serie.
// Gli script della ricerca scrivono anche i livelli: dopo averli rilanciati, eseguire questo script prima del commit.
// Uso: node ricerca/vix/struttura/ripulisci.mjs
import fs from 'node:fs';
const W = new URL('./', import.meta.url).pathname;
const LEVEL = new Set(['baa', 'hy', 'maxHy', 'maxBaa', 'minHy', 'minBaa', 'al_2025_04_02', 'massimo', 'massimo_del_periodo_hy']);
const THIRD = /HY OAS|IG OAS|BAA10Y|AAA10Y|Baa-Aaa|BAMLH0A0HYM2|BAMLC0A0CM/;
let n = 0;
const strip = (o, inThird) => {
  if (Array.isArray(o)) { o.forEach((x) => strip(x, inThird)); return; }
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)) {
    const third = inThird || THIRD.test(k);
    if ((k === 'baa' || k === 'hy' || k === 'baa10y' || k === 'dbaa_meno_dgs10' || /^(max|min)(Hy|Baa)$/.test(k) || (third && LEVEL.has(k))) && (typeof o[k] === 'number' || (o[k] && typeof o[k].v === 'number'))) { delete o[k]; n++; continue; } // anche { date, v }
    strip(o[k], third);
  }
};
for (const f of ['backtest/risultati.json', 'dati/risultati.json', '../../qa/1.6.0/numeri/dati_risultati_rieseguito.json']) {
  if (!fs.existsSync(W + f)) continue;
  const p = W + f, j = JSON.parse(fs.readFileSync(p, 'utf8'));
  strip(j, false);
  fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n');
}
{
  for (const f of ['dati/ricontrollo.json', '../../qa/1.6.0/numeri/ricontrollo_rieseguito.json']) {
    const p = W + f; if (!fs.existsSync(p)) continue;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const k of ['aprile_2025_HY', 'aprile_2025_BAA10Y']) if (j.credito && k in j.credito) { delete j.credito[k]; n++; }
    fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n');
  }
}
console.log(`tolti ${n} livelli`);

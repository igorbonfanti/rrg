// Confronto di definizioni del «massimo dell'ultima bull run» (richiesta dell'utente del 12/11/2026: il massimo di
// sempre è troppo lontano, per esempio per il petrolio). Usa la cache di dati.mjs (Yahoo, chiusure solo prezzo).
// A) regola 20%: un bear inizia quando la chiusura scende del 20% dal massimo; un bull quando risale del 20% dal minimo
//    del bear. Riferimento = massimo di chiusura dopo l'inizio dell'ultimo bull (il minimo da cui è risalito del 20%).
//    Varianti 20% / 25% / 30%.
// B) massimo delle ultime 3 anni (e 2 anni). C) massimo delle ultime 52 settimane.
// Uso: node ricerca/bolle-rotazione/riferimento/confronto.mjs
import fs from 'node:fs';
const C = new URL('../cache/', import.meta.url);
const M = { BTC: 'Y_BTC-USD', GOLD: 'Y_GLD', SILVER: 'Y_SLV', COPPER: 'Y_HG_F', WTI: 'Y_CL_F', NDX: 'Y__NDX', SPX: 'Y__GSPC', SOXX: 'Y_SOXX', KOSPI: 'Y__KS11' };
const pct = (a, b) => ((a / b - 1) * 100).toFixed(1);
function cycle(d, c, X) {
  // alterna picchi e minimi confermati; restituisce l'indice del minimo che ha fatto partire l'ultimo bull (o 0)
  let mode = 'bull', iPk = 0, iTr = 0, bullStart = 0;
  for (let i = 1; i < c.length; i++) {
    if (c[i] == null || c[i] <= 0) { if (mode === 'bull') { mode = 'bear'; iTr = i; } continue; }
    if (mode === 'bull') {
      if (c[i] > c[iPk]) iPk = i;
      if (c[i] <= c[iPk] * (1 - X)) { mode = 'bear'; iTr = i; }
    } else {
      if (c[iTr] == null || c[iTr] <= 0 || c[i] < c[iTr]) iTr = i;
      if (c[iTr] > 0 && c[i] >= c[iTr] * (1 + X)) { mode = 'bull'; bullStart = iTr; iPk = i; }
    }
  }
  let r = bullStart;
  for (let i = bullStart; i < c.length; i++) if (c[i] > c[r]) r = i;
  return { start: d[bullStart], ref: r, mode };
}
const out = {};
for (const [k, f] of Object.entries(M)) {
  const j = JSON.parse(fs.readFileSync(new URL(f + '.json', C)));
  const d = j.dates, c = j.close, n = d.length - 1, last = c[n];
  const win = (days) => { const from = new Date(Date.parse(d[n]) - days * 864e5).toISOString().slice(0, 10); let r = -1; for (let i = 0; i <= n; i++) if (d[i] > from && (r < 0 || c[i] > c[r])) r = i; return r; };
  let ath = 0; for (let i = 0; i <= n; i++) if (c[i] > c[ath]) ath = i;
  const row = { last: d[n], ath: [d[ath], pct(last, c[ath])] };
  for (const X of [0.2, 0.25, 0.3]) { const y = cycle(d, c, X); row['bull' + X * 100] = [d[y.ref], pct(last, c[y.ref]), 'bull dal ' + y.start, y.mode]; }
  for (const [nm, days] of [['3anni', 1095], ['2anni', 730], ['52sett', 365]]) { const r = win(days); row[nm] = [d[r], pct(last, c[r])]; }
  out[k] = row;
}
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(new URL('confronto.json', import.meta.url), JSON.stringify(out, null, 1));

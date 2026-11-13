/*
 * prima_corsa.mjs — effetto della 1.3.5 sulla prima corsa notturna.
 * Confronta i file scritti da fetch_data.js lanciato nello stesso momento con il codice di main (vecchio) e con
 * il nuovo yahoo.js, partendo dagli stessi file pubblicati su main; e ciascuno con il file pubblicato.
 * Per ogni file: date, ticker, valori diversi (per ticker: quante sedute, prima/ultima data, scarto massimo),
 * (oltre lo 0,01%: sotto è il rumore delle rettifiche di Yahoo tra due richieste), campi diversi da close (copied, max52, spliced, repaired, asOf, missing).
 * Uso: node prima_corsa.mjs <dir corsa vecchia> <dir corsa nuova> <dir main pubblicato>
 */
import fs from 'node:fs';
import path from 'node:path';

const [OLD, NEW, PUB] = process.argv.slice(2);
const read = (d, f) => { try { return JSON.parse(fs.readFileSync(path.join(d, 'data', f), 'utf-8')); } catch { return null; } };

function cmp(name, a, b, f) {
  if (!a || !b) return console.log(`${f} ${name}: file mancante`);
  const out = [];
  for (const k of ['asOf', 'expectedSession', 'lagSessions']) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(`${k}: ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`);
  for (const k of ['missing', 'repaired']) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(`${k}: ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`);
  const sa = new Set(a.dates), sb = new Set(b.dates);
  const onlyA = a.dates.filter((d) => !sb.has(d)), onlyB = b.dates.filter((d) => !sa.has(d));
  if (onlyA.length || onlyB.length) out.push(`date: solo prima ${onlyA.length} ${onlyA.slice(0, 5)}, solo dopo ${onlyB.length} ${onlyB.slice(0, 5)}`);
  const ia = new Map(a.dates.map((d, i) => [d, i]));
  const syms = new Set([...Object.keys(a.tickers || {}), ...Object.keys(b.tickers || {})]);
  for (const s of [...syms].sort()) {
    const ta = (a.tickers || {})[s], tb = (b.tickers || {})[s];
    if (!ta || !tb) { out.push(`${s}: ${ta ? 'tolto' : 'aggiunto'}`); continue; }
    let n = 0, first = null, last = null, maxRel = 0, maxAt = null;
    b.dates.forEach((d, j) => {
      const i = ia.get(d);
      if (i == null) return;
      const x = ta.close[i], y = tb.close[j];
      // le chiusure rettificate di Yahoo cambiano di qualche decimale tra due richieste: si conta solo oltre 0,01%
      if (x === y || (x != null && y != null && Math.abs(y / x - 1) < 1e-4)) return;
      n++; first ??= d; last = d;
      if (x != null && y != null) { const r = Math.abs(y / x - 1); if (r > maxRel) { maxRel = r; maxAt = d; } }
    });
    if (n) out.push(`${s}: ${n} sedute diverse (${first} … ${last}), scarto massimo ${(maxRel * 100).toFixed(2)}% il ${maxAt}`);
    for (const k of new Set([...Object.keys(ta), ...Object.keys(tb)])) {
      if (k === 'close') continue;
      if (JSON.stringify(ta[k]) !== JSON.stringify(tb[k])) out.push(`${s}.${k}: ${JSON.stringify(ta[k])?.slice(0, 160)} → ${JSON.stringify(tb[k])?.slice(0, 160)}`);
    }
  }
  console.log(`== ${f} · ${name}: ${out.length ? out.length + ' differenze' : 'identici a parte generated'}`);
  for (const l of out) console.log('   ' + l);
}

for (const f of ['prices.json', 'prices_global.json', 'prices_macro.json']) {
  cmp('vecchio → nuovo (stessa ora)', read(OLD, f), read(NEW, f), f);
  cmp('pubblicato → vecchio', read(PUB, f), read(OLD, f), f);
  cmp('pubblicato → nuovo', read(PUB, f), read(NEW, f), f);
}

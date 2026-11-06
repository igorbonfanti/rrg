// usd3m.mjs — «3 mesi locale» e «3 mesi in $» come in js/emerging-view.js (row → chUsd), con i dati veri, e quante volte
// nell'ultimo anno «3 mesi in $» sarebbe «—» perché manca il cambio della Fed alla seduta di partenza (festa negli Stati Uniti).
// Uso: node usd3m.mjs <data/emerging.json> <data/indices.json> <data/indices_more.json>
import fs from 'node:fs';
import { emSeries, cleanFx, onDates, inUsd, change } from '../../../../js/emerging.js';
import { indexSeries } from '../../../../js/indexdata.js';

const [emF, ixF, moreF] = process.argv.slice(2);
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const em = read(emF), ix = { ...read(ixF).series, ...read(moreF).series };
const cfg = read(new URL('../../../../config/emerging.json', import.meta.url));
// copia letterale di chUsd (emerging-view.js, riga 75)
const chUsd = (cl, u) => { let t = cl.length - 1; while (t >= 0 && cl[t] == null) t--; const tl = t; while (t >= 0 && u[t] == null) t--; return t < 0 ? null : { v: change(u, 63, t), t, lag: t < tl }; };
for (const k of cfg.order) {
  const c = cfg.indices[k], s = indexSeries(ix[k]);
  const f = c.fx ? cleanFx(c.fx, emSeries(em.series[c.fx])) : null;
  const fxOn = f ? onDates(f.dates, f.val, s.dates) : null;
  const usd = c.fx === null ? s.close : inUsd(s.close, fxOn);
  const r = chUsd(s.close, usd), L = s.dates.length - 1;
  // ultimo anno: a ogni seduta t (come se fosse l'ultima) quante volte manca il cambio a t-63 o a t
  let nullStart = 0, nullEnd = 0, tot = 0; const ex = [];
  for (let t = L - 250; t <= L; t++) {
    if (!fxOn) break;
    tot++;
    if (fxOn[t] == null) nullEnd++;
    else if (fxOn[t - 63] == null) { nullStart++; if (ex.length < 4) ex.push(s.dates[t - 63]); }
  }
  console.log(`${k.padEnd(9)} ultima ${s.dates[L]} · 3m locale ${change(s.close, 63)?.toFixed(2)}% · 3m in $ ${r && r.v != null ? r.v.toFixed(2) + '%' : '—'}${r && r.lag ? ` * al ${s.dates[r.t]}` : ''} · cambio al ${f ? f.dates.at(-1) : '—'} (Fed ${f ? f.fred : '—'})` +
    (fxOn ? `\n          ultimo anno: ${nullStart}/${tot} sedute con «—» per il cambio mancante alla partenza (es. ${ex.join(', ')}), ${nullEnd} senza cambio all'arrivo` : ''));
}

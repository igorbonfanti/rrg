// Vista 7: i rendimenti cap ed equal-weight dei settori (data/sector_members.json) contro gli ETF settoriali sugli stessi
// intervalli, solo prezzo: equal-weight contro gli Invesco RSP*, cap-weighted contro gli SPDR XL* (che tagliano il peso
// dei giganti). Scarica le chiusure da Yahoo e scrive ricerca/settori-titoli/confronto_etf.json, citato nella nota «Dati».
// Uso: node ricerca/settori-titoli/script/confronto_etf.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily } from '../../../scripts/lib/yahoo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sm = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sector_members.json'), 'utf8'));
const EW = { XLK: 'RSPT', XLC: 'RSPC', XLY: 'RSPD', XLP: 'RSPS', XLE: 'RSPG', XLF: 'RSPF', XLV: 'RSPH', XLI: 'RSPN', XLB: 'RSPM', XLRE: 'RSPR', XLU: 'RSPU', SPX: 'RSP' };
const CW = { XLK: 'XLK', XLC: 'XLC', XLY: 'XLY', XLP: 'XLP', XLE: 'XLE', XLF: 'XLF', XLV: 'XLV', XLI: 'XLI', XLB: 'XLB', XLRE: 'XLRE', XLU: 'XLU', SPX: 'SPY' };
const px = {};
for (const t of [...new Set([...Object.values(EW), ...Object.values(CW)])]) {
  px[t] = await fetchDaily(t, { range: '2y' });
  await new Promise((r) => setTimeout(r, 200));
}
const at = (t, d) => { const p = px[t], i = p.dates.indexOf(d); return i < 0 ? null : p.close[i]; };
const ret = (t, d0, d1) => { const a = at(t, d0), b = at(t, d1); return a == null || b == null ? null : 100 * (b / a - 1); };
const rows = [];
for (const k of Object.keys(sm.sectors)) for (const per of Object.keys(sm.starts)) {
  const j = 0; // ultima data del file
  const [cap, eq] = sm.sectors[k][per][j], d0 = sm.starts[per][j], d1 = sm.dates[j];
  const e = ret(EW[k], d0, d1), c = ret(CW[k], d0, d1);
  rows.push({ k, per, d0, d1, cap, eq, rsp: e == null ? null : +e.toFixed(2), xl: c == null ? null : +c.toFixed(2),
    dEq: e == null ? null : +(eq - e).toFixed(2), dCap: c == null ? null : +(cap - c).toFixed(2) });
}
const mean = (a) => +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);
const absEq = rows.filter((r) => r.dEq != null).map((r) => Math.abs(r.dEq));
const cap3 = rows.filter((r) => r.per === '3M' && r.dCap != null).map((r) => ({ k: r.k, d: r.dCap }));
const summary = {
  asOf: sm.dates[0], confronti: absEq.length,
  equalVsRsp: { mediaAssoluta: mean(absEq), max: Math.max(...absEq) },
  equalVsRsp3M: mean(rows.filter((r) => r.per === '3M' && r.dEq != null).map((r) => Math.abs(r.dEq))),
  capVsXl3M: cap3.sort((a, b) => Math.abs(b.d) - Math.abs(a.d)),
};
for (const r of rows) console.log(r.k.padEnd(5), r.per.padEnd(4), r.d0, r.d1, 'eq', r.eq, 'RSP', r.rsp, 'Δ', r.dEq, '| cap', r.cap, 'XL', r.xl, 'Δ', r.dCap);
console.log(JSON.stringify(summary, null, 1));
fs.writeFileSync(path.join(ROOT, 'ricerca/settori-titoli/confronto_etf.json'), JSON.stringify({ summary, rows }, null, 1) + '\n');

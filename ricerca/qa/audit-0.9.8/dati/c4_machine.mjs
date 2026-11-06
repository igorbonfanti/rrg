// C4 (parte 1). Cosa mostra l'app: macchina a stati (js/signals.js runMachine) sui dati pubblicati, per gli 11 settori
// e i 22 indici: stato all'ultima seduta, eventi del 2026, confronto con data/alerts.json (solo settori, come
// scripts/send_alerts.js). Il controllo indipendente delle condizioni è in c4_alerts.py.
// uso: node c4_machine.mjs  (scrive $QA98/c4_machine.json)
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, SECTOR_KEYS, DEFAULT_PARAMS } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';

const R = process.env.RRG || '/home/user/rrg';
const W = process.env.QA98 || '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa98';
const read = (f) => JSON.parse(fs.readFileSync(`${R}/${f}`, 'utf-8'));
const B = read('data/breadth.json'), S = read('data/sectors.json'), T = read('config/thresholds.json'), A = read('data/alerts.json');
const IC = read('config/indices.json'), I = { ...read('data/indices_more.json').series, ...read('data/indices.json').series };
const P = { ...DEFAULT_PARAMS, ...T.params };
const out = { sectors: {}, indices: {} };
const lastDef = (a) => { let t = a.length - 1; while (t > 0 && a[t] == null) t--; return t; };

const events = [];
for (const s of SECTOR_KEYS) {
  const px = priceSeries(S.adjclose[s]), br = breadthSeries(B, s, S.dates), m = runMachine(px, br, T.blue[s], P);
  const now = lastDef(br.pct200), t = lastDef(m.days.slice(0, now + 1));
  out.sectors[s] = { date: S.dates[now], state: m.days[t], b: br.pct200[now], above: br.above200[now], n: br.n[now], L: T.blue[s], dd: px.dd[now], dp: px.dp[now],
    below: m.below, armed: m.armed, ev2026: m.events.filter((e) => S.dates[e.t] >= '2026-01-01').map((e) => ({ date: S.dates[e.t], code: e.code, text: e.text })),
    lastEvents: m.events.slice(-3).map((e) => ({ date: S.dates[e.t], code: e.code })) };
  for (const e of m.events) events.push({ date: S.dates[e.t], sector: s, code: e.code, text: e.text });
}
const key = (e) => `${e.date}|${e.sector}|${e.code}`;
const now = new Set(events.map(key));
out.alertsCheck = A.log.map((e) => ({ ...e, inMachine: now.has(key(e)), sameText: events.some((x) => key(x) === key(e) && x.text === e.text) }));
out.unlogged = events.filter((e) => e.date > '2026-09-01' && !A.log.some((x) => key(x) === key(e)));
out.thresholdsSame = JSON.stringify(A.thresholds) === JSON.stringify(T.blue);
out.checkedThrough = A.checkedThrough;

for (const [k, x] of Object.entries(I)) {
  const s = indexSeries(x), px = priceSeries(s.close), L = IC.indices[k].blue, m = runMachine(px, s, L, P);
  const nowI = lastDef(s.pct200), t = lastDef(m.days.slice(0, nowI + 1));
  out.indices[k] = { date: s.dates[nowI], priceDate: s.dates.at(-1), state: m.days[t], b: s.pct200[nowI], L, dd: px.dd[nowI], dp: px.dp[nowI], ddLast: px.dd.at(-1), dpLast: px.dp.at(-1),
    ev2026: m.events.filter((e) => s.dates[e.t] >= '2026-01-01').map((e) => ({ date: s.dates[e.t], code: e.code, text: e.text })) };
}
fs.writeFileSync(`${W}/c4_machine.json`, JSON.stringify(out, null, 1));
const f1 = (v) => (v == null ? '—' : v.toFixed(1));
console.log('Settori (stato secondo runMachine all\'ultima seduta con breadth):');
for (const [s, v] of Object.entries(out.sectors)) console.log(`  ${s.padEnd(5)} ${v.date} ${String(v.state).padEnd(7)} breadth ${f1(v.b)}% (${v.above}/${v.n}) blu ${v.L}% dd ${f1(v.dd)}% (${v.dp}°) eventi 2026: ${JSON.stringify(v.ev2026.map((e) => e.date + ' ' + e.code))}`);
console.log('\nRegistro alerts.json contro la macchina:'); for (const e of out.alertsCheck) console.log(`  ${e.date} ${e.sector} ${e.code} nella macchina: ${e.inMachine}, stesso testo: ${e.sameText}`);
console.log('Eventi dopo l\'01/09/2026 non registrati:', JSON.stringify(out.unlogged), '| livelli del registro = config:', out.thresholdsSame, '| checkedThrough', out.checkedThrough);
console.log('\nIndici:');
for (const [k, v] of Object.entries(out.indices)) console.log(`  ${k.padEnd(9)} breadth ${v.date} prezzo ${v.priceDate} ${String(v.state).padEnd(7)} breadth ${f1(v.b)}% blu ${v.L}% dd ${f1(v.ddLast)}% (${v.dpLast}°) eventi 2026: ${JSON.stringify(v.ev2026.map((e) => e.date + ' ' + e.code))}`);

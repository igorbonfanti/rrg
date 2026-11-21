#!/usr/bin/env node
/*
 * tabelle.mjs — scrive le tabelle di ricerca/rotazione-bolle/backtest.md partendo da risultati.json (nessun calcolo
 * nuovo: solo formato). Uso: node ricerca/rotazione-bolle/script/tabelle.mjs > ricerca/rotazione-bolle/tabelle.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = JSON.parse(fs.readFileSync(path.join(BASE, 'risultati.json'), 'utf-8'));
const IDS = Object.keys(R.series);
const L = Object.fromEntries(IDS.map((id) => [id, R.series[id].label]));
const it = (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '—');
const num = (x, dec = 1) => (x == null ? '—' : x.toFixed(dec).replace('-', '−').replace('.', ','));
const pct = (x) => (x == null ? '—' : num(x) + '%');
const sg = (x) => (x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + String(Math.abs(x)).replace('.', ','));
const line = (a) => '| ' + a.join(' | ') + ' |';
const head = (a) => line(a) + '\n' + line(a.map(() => '---'));
const out = [];
const P = (s = '') => out.push(s);

// 1. episodi
P('### T1. Massimi di ciclo seguiti da un calo ≥ 20% (chiusure, dal 2000; bitcoin dal 2015)');
P();
P('Numero di episodi per soglia:');
P();
P(head(['Mercato', '≥ 15%', '≥ 20%', '≥ 30%', '≥ 40%', 'Dati da', 'Massimi validi da']));
for (const id of IDS) { const c = R.counts[id]; P(line([L[id], c[15], c[20], c[30], c[40] ?? '·', it(R.series[id].from), it(R.series[id].eligibleFrom > '2000-01-01' ? R.series[id].eligibleFrom : '2000-01-01')])); }
P();
P('S&P 500 ≥ 10% (usato per i falsi allarmi): ' + R.counts.SPX[10] + ' episodi.');
P();
for (const id of IDS) {
  P(`**${L[id]}** (≥ 20%): ` + R.episodes[id][20].map((p) => `${it(p.date)} ${p.belowZero ? 'oltre −100% (chiusura sotto zero il ' + it(p.troughDate) + ')' : pct(p.ddPct)}, discesa ${p.daysDown} g${p.ongoing ? ', in corso' : p.daysToRecovery != null ? ', recupero ' + p.daysToRecovery + ' g' : ', non recuperato'}`).join('; ') + '.');
  P();
}
for (const [id, X] of [['BTC', 40], ['SILVER', 40], ['SPX', 15], ['SPX', 10], ['NDX', 15]]) {
  P(`**${L[id]} ≥ ${X}%**: ` + R.episodes[id][X].map((p) => `${it(p.date)} ${pct(p.ddPct)}${p.ongoing ? ' (in corso)' : ''}`).join('; ') + '.');
  P();
}

// 2. finestre
const cell = (m) => {
  if (m.status === 'nodata') return '—';
  if (m.status === 'anchor') return '**0**';
  if (m.status === 'none') return m.alt15 ? `· (15%: ${sg(m.alt15.offset)})` : '·';
  let s = sg(m.offset);
  if (Math.abs(m.offset) <= 31) s = '≈' + s;
  if (m.all && m.all.length > 1) s += ' [' + m.all.filter((x) => x.offset !== m.offset).map((x) => sg(x.offset)).join(', ') + ']';
  return s;
};
const winTable = (rows, title, extra = []) => {
  P(title); P();
  P(head(['Massimo', 'Calo', ...IDS.map((id) => L[id])]));
  for (const r of [...rows, ...extra]) P(line([it(r.peak) + (r.ongoing ? ' (in corso)' : ''), pct(r.ddPct), ...IDS.map((id) => cell(r.markets[id]))]));
  P();
};
winTable(R.windows.SPX15, '### T2. Finestre dei cali ≥ 15% dell\'S&P 500: giorni tra il massimo di ogni mercato e quello dell\'S&P 500', R.windows.SPX10.filter((r) => r.ongoing));
P('Numero = giorni di calendario dal massimo dell\'S&P 500 (negativo = prima) del massimo di ciclo ≥ 20% più alto del mercato entro ±365 giorni; ≈ = insieme (entro 31 giorni); tra parentesi quadre gli altri massimi ≥ 20% nella finestra; · = nessun massimo seguito da un calo ≥ 20% nella finestra (tra parentesi lo scarto con la soglia 15%, se c\'è); — = serie troppo corta. L\'ultima riga è il calo in corso dell\'S&P 500 (≥ 10%, non ancora 15%).');
P();
winTable(R.windows.NDX20, '### T2b. Finestre dei cali ≥ 20% del Nasdaq-100');

// riepilogo prima/insieme/dopo
P('### T2c. Chi prima, chi insieme, chi dopo (cali ≥ 15% dell\'S&P 500)'); P();
P(head(['Massimo S&P 500', 'Prima (oltre 1 mese)', 'Insieme (±1 mese)', 'Dopo (oltre 1 mese)', 'Nessun calo ≥ 20%', 'Dati mancanti']));
for (const r of [...R.windows.SPX15, ...R.windows.SPX10.filter((x) => x.ongoing)]) {
  const ids = (st) => IDS.filter((id) => r.markets[id].status === st).map((id) => L[id]).join(', ') || '—';
  const byO = (f) => IDS.filter((id) => r.markets[id].offset != null && f(r.markets[id].offset)).sort((a, b) => r.markets[a].offset - r.markets[b].offset).map((id) => `${L[id]} (${sg(r.markets[id].offset)})`).join(', ') || '—';
  P(line([it(r.peak), byO((o) => o < -31), byO((o) => Math.abs(o) <= 31), byO((o) => o > 31), ids('none'), ids('nodata')]));
}
P();

// 3. ordine tipico
P('### T3. Ordine tipico (8 cali ≥ 15% dell\'S&P 500, 2000-2025)'); P();
P(head(['Mercato', 'Con un massimo nella finestra', 'Prima', 'Insieme', 'Dopo', 'Scarto mediano (g)', 'Rango medio (0 = primo, 1 = ultimo)', 'Nessun calo ≥ 20%', 'Dati mancanti']));
const ord = R.order.SPX15;
for (const id of [...IDS].sort((a, b) => (ord[a].meanRankNorm ?? 9) - (ord[b].meanRankNorm ?? 9))) {
  const o = ord[id];
  P(line([L[id], `${o.withPeak} su ${o.episodes - o.nodata}`, o.before, o.together, o.after, sg(o.medianOffset), num(o.meanRankNorm, 2), o.none, o.nodata]));
}
P();
P('Con i soli 4 cali ≥ 20% dell\'S&P 500: ' + [...IDS].sort((a, b) => (R.order.SPX20[a].meanRankNorm ?? 9) - (R.order.SPX20[b].meanRankNorm ?? 9)).map((id) => `${L[id]} ${num(R.order.SPX20[id].meanRankNorm, 2)} (mediana ${sg(R.order.SPX20[id].medianOffset)} g, ${R.order.SPX20[id].withPeak} casi)`).join('; ') + '.');
P();
P('Con i 6 cali ≥ 20% del Nasdaq-100: ' + [...IDS].sort((a, b) => (R.order.NDX20[a].meanRankNorm ?? 9) - (R.order.NDX20[b].meanRankNorm ?? 9)).map((id) => `${L[id]} ${num(R.order.NDX20[id].meanRankNorm, 2)} (mediana ${sg(R.order.NDX20[id].medianOffset)} g, ${R.order.NDX20[id].withPeak} casi)`).join('; ') + '.');
P();

// 4. criteri
P('### T4. Criterio dell\'anticipatore (riferimento: i 4 cali ≥ 20% dell\'S&P 500; mercati ≥ 20%)'); P();
P(head(['Mercato o gruppo', '(a) colti', 'Base (a)', '(b) falsi allarmi', 'Base (b)', '(a) 2000-12', '(a) 2013-oggi', '(b) 2000-12', '(b) 2013-oggi', 'In sospeso', 'a', 'b', 'c', 'Esito']));
const yn = (x) => (x ? 'sì' : 'no');
const fb = R.baseB.all;
for (const [k, v] of Object.entries(R.criteria)) {
  const a = v.perPeriod;
  const fa = (p) => (p.alarms ? `${p.falseAlarms} su ${p.alarms}` : '—');
  const ca = (p) => (p.cases ? `${p.hits} su ${p.cases}` : '—');
  P(line([k === k.toUpperCase() ? L[k] : k, `${ca(a.all)} (${pct(a.all.hitPct)})`, pct(v.baseA.all.pct), `${fa(a.all)} (${pct(a.all.falsePct)})`, pct(r1(100 - fb.pct)), ca(a.p1), ca(a.p2), fa(a.p1), fa(a.p2), v.pendingAlarms, yn(v.critA), yn(v.critB), yn(v.critC), v.useful ? '**utile**' : 'no']));
}
P();
function r1(x) { return Math.round(x * 10) / 10; }
P(`Base (a): quota delle sedute dell'S&P 500 dal 2000 (con i dati del mercato) che hanno un massimo di ciclo ≥ 20% del mercato tra 365 e 30 giorni prima: quanto spesso il criterio sarebbe «colto» per caso, scegliendo un giorno qualsiasi. Base (b): quota delle sedute dell'S&P 500 dal 2000 NON seguite da un calo ≥ 10% entro 365 giorni (${fb.sessions - fb.followedBy10} su ${fb.sessions}): il tasso di falsi allarmi di un allarme dato a caso.`);
P();
P('### T4b. Sensibilità (colti / casi; falsi allarmi / allarmi; criteri a-b-c)'); P();
const sk = Object.keys(R.sensitivity);
P(head(['Mercato o gruppo', 'Principale', ...sk]));
const cs = (v) => { const a = v.perPeriod.all; return `${a.hits}/${a.cases}; ${a.falseAlarms}/${a.alarms}; ${yn(v.critA)}-${yn(v.critB)}-${yn(v.critC)}`; };
for (const k of Object.keys(R.criteria)) P(line([k === k.toUpperCase() ? L[k] : k, cs(R.criteria[k]), ...sk.map((s) => cs(R.sensitivity[s][k]))]));
P();

// conferma
P('### T5. Il massimo di chi «arriva prima» si sapeva in tempo? (cali ≥ 15% dell\'S&P 500)'); P();
P('Ogni massimo di ciclo ≥ 20% arrivato tra 365 e 30 giorni prima del massimo dell\'S&P 500: giorni dal massimo dell\'S&P 500 al giorno in cui il mercato era già sceso del 20% (la «conferma»). Negativo = la conferma è arrivata prima del massimo dell\'S&P 500.'); P();
P(head(['Massimo S&P 500', 'Mercato', 'Data del massimo', 'Massimo (g)', 'Conferma del −20% (g)', 'Conferma prima del massimo S&P 500?']));
for (const x of R.earlyConfirm.list) P(line([it(x.anchor) + (x.ongoing ? ' (in corso)' : ''), L[x.id], it(x.date), sg(x.offset), sg(x.confirmOffset), x.confirmOffset < 0 ? 'sì' : 'no']));
P();
P('Per mercato (cali conclusi): ' + IDS.filter((id) => R.earlyConfirm.byMarket[id]).map((id) => `${L[id]} ${R.earlyConfirm.byMarket[id].confirmedBefore} su ${R.earlyConfirm.byMarket[id].closed}`).join('; ') + '.');
P();
P(`Nei cali conclusi (2000-2025): ${R.earlyConfirm.confirmedBefore} conferme arrivate prima del massimo dell'S&P 500 su ${R.earlyConfirm.closed} massimi arrivati prima.`);
P();

// oggi
P('### T6. Oggi: massimo degli ultimi 3 anni (athStats di js/ath.js) all\'ultima seduta scaricata'); P();
P(head(['Mercato', 'Ultima seduta', 'Massimo 3 anni', 'Giorni rispetto al massimo dell\'S&P 500', 'Distanza oggi', 'Calo massimo dal massimo', 'Massimo di ciclo in corso']));
const T = R.today;
for (const id of [...IDS].sort((a, b) => (T[a].ref3yDate < T[b].ref3yDate ? -1 : 1))) {
  const t = T[id];
  const on = t.ongoing[30] ? '≥ 30%' : t.ongoing[20] ? '≥ 20%' : t.ongoing[15] ? '≥ 15%' : t.ongoing[10] ? '≥ 10%' : 'no';
  P(line([L[id], it(t.lastDate), it(t.ref3yDate), sg(t.offsetVsSpxRef), pct(t.distPct), t.belowZero ? 'sotto zero' : pct(t.cycleLowPct), on]));
}
P();
process.stdout.write(out.join('\n') + '\n');

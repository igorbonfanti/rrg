#!/usr/bin/env node
/*
 * tabelle.mjs — solo formato: da risultati.json e sintetico.json scrive ricerca/cicli/lead-lag/tabelle.md
 * (elenchi completi dei cicli, delle coppie e delle prove). Nessun calcolo nuovo oltre a conteggi e arrotondamenti.
 * Uso: node ricerca/cicli/lead-lag/script/tabelle.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = JSON.parse(fs.readFileSync(path.join(BASE, 'risultati.json'), 'utf8'));
const Y = JSON.parse(fs.readFileSync(path.join(BASE, 'sintetico.json'), 'utf8'));
const IDS = ['BTC', 'GOLD', 'SILVER', 'COPPER', 'WTI', 'NDX', 'SPX', 'SOXX', 'KOSPI'];
const L = { BTC: 'Bitcoin', GOLD: 'Oro', SILVER: 'Argento', COPPER: 'Rame', WTI: 'Petrolio WTI', NDX: 'Nasdaq-100', SPX: 'S&P 500', SOXX: 'Semiconduttori', KOSPI: 'KOSPI' };
const T = { peak: 'massimi', trough: 'minimi' };
const it = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
const n2 = (x, k = 2) => (x == null ? '—' : x.toFixed(k).replace('.', ',').replace('-', '−'));
const pf = (p) => (p == null ? '—' : p < 0.001 ? '< 0,001' : n2(p, 3));
const pc = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);
const sg = (x) => (x == null ? '—' : (x > 0 ? '+' : '') + (Number.isInteger(x) ? String(x) : n2(x, 1)).replace('-', '−'));
const row = (a) => `| ${a.join(' | ')} |`;
const head = (a) => row(a) + '\n' + row(a.map(() => '---'));
const out = [];
const P = (s = '') => out.push(s);

P('# Tabelle complete · lead-lag dei cicli dei 9 mercati');
P();
P(`Generato da \`script/tabelle.mjs\` da \`risultati.json\` (dati fino al ${it(R.asOf)}) e \`sintetico.json\`. Metodo in \`sintesi.md\`.`);
P();
P('## T1. Punti di svolta per mercato e soglia (dal 01/01/1999 o da un anno dopo l\'inizio della serie)');
P();
P(head(['Mercato', 'Da', 'Massimi 15%', '20%', '30%', 'Minimi 15%', '20%', '30%']));
for (const id of IDS) { const c = R.counts[id]; P(row([L[id], it(c.from), c.peak15, c.peak20, c.peak30, c.trough15, c.trough20, c.trough30])); }
const tot = (k) => IDS.reduce((s, id) => s + R.counts[id][k], 0);
P(row(['**Totale**', '', tot('peak15'), tot('peak20'), tot('peak30'), tot('trough15'), tot('trough20'), tot('trough30')]));
P();
P(`Controlli: massimi uguali a \`cyclePeaks\` di \`js/peaks.js\` in ${R.checks.peaksVsApp.filter((c) => c.same).length} casi su ${R.checks.peaksVsApp.length} (mercato × soglia); date dei massimi del petrolio uguali con e senza il 20/04/2020: ${R.checks.wtiNegative.every((c) => c.same) ? 'sì' : 'no'}.`);
P();

P('## T2. Concordanza e fuori campione (criteri 1 e 3)');
P();
P(head(['Tipo', 'Soglia', 'Punti', 'Cicli comuni (≥ 3 mercati)', 'Coppie di cicli', 'ρ medio', 'Nullo: mediana [5%, 95%]', 'p', 'Fuori campione: cicli dal 2013', 'ρ fuori campione', 'p nullo', 'p permutazione']));
for (const ty of ['peak', 'trough']) for (const X of [15, 20, 30]) {
  const o = R.order[`${ty}${X}`];
  P(row([T[ty], `${X}%`, o.points, o.cycles, o.concordance.pairs, n2(o.concordance.rho, 3), `${n2(o.concordance.null.q50, 3)} [${n2(o.concordance.null.q05, 3)}, ${n2(o.concordance.null.q95, 3)}]`, pf(o.concordance.p), o.oos.cycles, n2(o.oos.rho, 3), pf(o.oos.p), pf(o.oos.pPerm)]));
}
P();
P(`Ripetizioni del modello nullo: ${R.reps.concordance} (concordanza e fuori campione), ${R.reps.perm} permutazioni.`);
P();
P('### T2s. Sensibilità (solo descrittiva; 2000 ripetizioni)');
P();
const SN = { D182: 'gruppo ≤ 182 giorni', D548: 'gruppo ≤ 548 giorni', senzaNDX: 'senza Nasdaq-100', min4: 'cicli con ≥ 4 mercati', spostamentoMin730: 'nullo con spostamento ≥ 730 giorni' };
P(head(['Variante', ...['peak', 'trough'].flatMap((ty) => [15, 20, 30].map((X) => `${T[ty]} ${X}%: ρ (p) · fuori campione (p)`))]));
for (const [k, v] of Object.entries(R.sens)) P(row([SN[k] || k, ...['peak', 'trough'].flatMap((ty) => [15, 20, 30].map((X) => { const s = v[`${ty}${X}`]; return `${n2(s.rho, 3)} (${pf(s.p)}) · ${n2(s.oos, 3)} (${pf(s.pOos)})`; }))]));
P();

P('## T3. Rango medio nei cicli comuni (0 = primo, 1 = ultimo), tutti i cicli');
P();
for (const X of [15, 20, 30]) {
  P(`**Soglia ${X}%**`);
  P();
  P(head(['Mercato', 'Massimi: rango medio (cicli)', 'stima fino al 2012', 'dal 2013', 'Minimi: rango medio (cicli)', 'stima fino al 2012', 'dal 2013']));
  const rk = (o, m) => (o[m] ? `${n2(o[m].mean)} (${o[m].n})` : '—');
  for (const id of IDS) {
    const a = R.order[`peak${X}`], b = R.order[`trough${X}`];
    P(row([L[id], rk(a.meanRank, id), rk(a.oos.est, id), rk(a.meanRankSecond, id), rk(b.meanRank, id), rk(b.oos.est, id), rk(b.meanRankSecond, id)]));
  }
  P();
}

P('## T4. Cicli comuni (≥ 3 mercati): ordine dei mercati');
P();
P('Data del ciclo = data mediana dei punti. Tra parentesi i giorni dal primo mercato del ciclo. I gruppi con 1 o 2 mercati non sono elencati (conteggio sotto ogni tabella).');
P();
for (const ty of ['peak', 'trough']) for (const X of [15, 20, 30]) {
  const o = R.order[`${ty}${X}`];
  P(`### ${T[ty][0].toUpperCase() + T[ty].slice(1)}, soglia ${X}% (${o.cycles} cicli comuni)`);
  P();
  P(head(['Ciclo', 'Mercati', 'Ordine (giorni dal primo)']));
  for (const c of o.list.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    const t0 = Date.parse(c.markets[0].date);
    P(row([it(c.date), c.markets.length, c.markets.map((x) => `${L[x.m]} ${it(x.date)} (${sg(Math.round((Date.parse(x.date) - t0) / 86400000))})`).join(' → ')]));
  }
  P();
  P(`Gruppi con meno di 3 mercati: ${o.small.length}.`);
  P();
}

P('## T5. Coppie guida → seguace (criterio 2)');
P();
P(`Test: ${R.pairs.length} (72 coppie ordinate × 2 tipi × 3 soglie), ${R.pairs.filter((p) => p.pNull != null).length} con almeno un caso. Nullo principale con spostamento ≥ ${R.minShiftPairs} giorni (${R.reps.pairs} ripetizioni); \`p0\`/\`q0\`: nullo con spostamento libero. q = p corretto con Benjamini-Hochberg su tutti i test.`);
P();
P(`**Passano il criterio 2**: ${R.criteria.c2.passing.length ? R.criteria.c2.passing.join(', ') : 'nessuna'}.`);
P();
P('### T5a. Le 30 coppie con il p del nullo più basso');
P();
P(head(['Tipo', 'Soglia', 'A → B', 'Casi', 'Dopo', 'Stesso giorno', 'Quota dopo', 'Scarto mediano (g)', 'p binomiale', 'p nullo', 'q', 'p0', 'q0', '2000-2012', '2013-2025', 'Criterio 2']));
const top = R.pairs.filter((p) => p.pNull != null).sort((a, b) => a.pNull - b.pNull || b.share - a.share).slice(0, 30);
for (const p of top) P(row([T[p.type], `${p.X}%`, `${L[p.A]} → ${L[p.B]}`, p.cases, p.after, p.same, pc(p.share), sg(p.medianOff), pf(p.pBinom), pf(p.pNull), pf(p.qBH), pf(p.pNull0), pf(p.qBH0), `${p.h1.after}/${p.h1.cases}`, `${p.h2.after}/${p.h2.cases}`, p.pass2 ? '**sì**' : 'no']));
P();
P('### T5b. Quota «dopo» ≥ 75% con almeno 8 casi (prima della correzione)');
P();
const raw75 = R.pairs.filter((p) => p.share != null && p.share >= 0.75 && p.cases >= 8);
P(`${raw75.length} combinazioni su ${R.pairs.length}.`);
P();
P(head(['Tipo', 'Soglia', 'A → B', 'Casi', 'Quota', 'Scarto mediano', 'q', 'Metà', 'Perché non passa']));
for (const p of raw75.sort((a, b) => a.qBH - b.qBH)) {
  const why = [];
  if (!p.c2.q) why.push('q ≥ 0,05');
  if (!p.c2.halves) why.push(p.A === 'BTC' || p.B === 'BTC' ? 'bitcoin: solo dal 2015' : 'una metà sotto il 75% o con meno di 3 casi');
  P(row([T[p.type], `${p.X}%`, `${L[p.A]} → ${L[p.B]}`, p.cases, pc(p.share), sg(p.medianOff), pf(p.qBH), `${p.h1.after}/${p.h1.cases} · ${p.h2.after}/${p.h2.cases}`, why.join('; ') || '—']));
}
P();
P('### T5c. Casi delle coppie che passano il criterio 2');
P();
for (const p of R.pairs.filter((x) => x.pass2)) {
  P(`**${T[p.type]} ${p.X}%, ${L[p.A]} → ${L[p.B]}** (giorno della svolta di ${L[p.A]}, tra parentesi i giorni fino a quella di ${L[p.B]}): ` + p.list.map((c) => `${it(c.a)} (${sg(c.off)})`).join(', ') + `. Dopo più di 31 giorni (fuori da «insieme» dello studio precedente): ${p.after31} su ${p.cases}.`);
  P();
}

P('## T6. Utilità dal giorno di conferma (criterio 4)');
P();
P(`Modo: ${R.utility.mode}.`);
P();
for (const u of R.utility.rows) {
  const [A, B] = u.pair.split('→');
  P(`**${T[u.type]} ${u.X}%, ${L[A]} → ${L[B]}**: svolte di ${L[A]} ${u.n}, colpi ${u.hits} (${pc(u.rate)}), base ${pc(u.baseRate)}, p ${pf(u.pHit)}; anticipo mediano dalla conferma alla svolta di ${L[B]} ${u.medianLead == null ? "—" : n2(u.medianLead, Number.isInteger(u.medianLead) ? 0 : 1)} giorni (alla sua conferma ${u.medianLeadConf == null ? "—" : n2(u.medianLeadConf, Number.isInteger(u.medianLeadConf) ? 0 : 1)}). Utile: ${u.useful ? 'sì' : 'no'}.`);
  P();
  P(head([`Svolta ${L[A]}`, 'Conferma', 'Finestra (g)', `Svolta ${L[B]} dopo la conferma`, 'Anticipo (g)', 'Base']));
  for (const c of u.cases) P(row([it(c.a), it(c.conf), c.window, c.hit ? it(c.b) : '—', c.lead ?? '—', pc(c.base)]));
  P();
}

P(`## T7. Oggi (${it(R.asOf)})`);
P();
P(head(['Mercato', 'Ultima seduta', 'Massimo di 52 settimane', 'Distanza', 'Minimo di 52 settimane', 'Distanza', 'Ultimo massimo ≥ 15% (conferma; superato)', 'Ultimo massimo ≥ 20%', 'Ultimo minimo ≥ 15% (conferma; rotto)', 'Ultimo minimo ≥ 20%']));
const pk = (x, k) => (x ? `${it(x.date)} (${it(x.conf)}; ${x[k] ? it(x[k]) : 'no'})` : '—');
for (const id of IDS) { const o = R.today[id]; P(row([L[id], it(o.lastDate), it(o.hi52Date), `${n2(o.fromHi, 1)}%`, it(o.lo52Date), `+${n2(o.fromLo, 1)}%`, pk(o.peak15, 'recovered'), pk(o.peak20, 'recovered'), pk(o.trough15, 'broken'), pk(o.trough20, 'broken')])); }
P();

P('## T8. Prove su serie sintetiche (`script/sintetico.mjs`)');
P();
P(`${Y.note} Ripetizioni: ${Y.reps} (concordanza), ${Y.pairReps} (coppie).`);
P();
P('**A. Ritardo noto** (mercato k = fattore comune spostato di 30·k giorni + rumore)');
P();
P(head(['Tipo e soglia', 'Cicli', 'ρ', 'p', 'Fuori campione', 'p']));
for (const [k, v] of Object.entries(Y.A.order)) P(row([k, v.cycles, n2(v.rho, 3), pf(v.p), n2(v.oos, 3), pf(v.pOos)]));
P();
P(`Coppie in avanti con ritardo vero 30-120 giorni: ${Y.A.summary.forwardPairsUpTo120}, di cui passano il criterio 2: ${Y.A.summary.forwardPass2}; coppie al contrario che lo passano: ${Y.A.summary.reversePass2}. Scarto mediano trovato per ritardo vero 30/60/90/120 giorni: ${Object.values(Y.A.summary.medianOffByLag).map((x) => n2(x, 1)).join(' / ')}.`);
P();
P(head(['Coppia a 60 giorni', 'Tipo e soglia', 'Casi', 'Quota dopo', 'Scarto mediano', 'q', 'Criterio 2']));
for (const p of Y.A.pairsLag60) P(row([p.pair, `${p.type}${p.X}`, p.cases, pc(p.share), sg(p.medianOff), pf(p.qBH), p.pass2 ? 'sì' : 'no']));
P();
P('**B. Una sola coppia a 60 giorni** («argento» = «oro» spostato di 60 giorni + rumore, gli altri indipendenti)');
P();
P(head(['Tipo e soglia', 'Casi', 'Quota dopo', 'Scarto mediano', 'p nullo', 'q', 'Criterio 2']));
for (const p of Y.B.goldSilver) P(row([`${p.type}${p.X}`, p.cases, pc(p.share), sg(p.medianOff), pf(p.pNull), pf(p.qBH), p.pass2 ? 'sì' : 'no']));
P();
P(`Altre coppie che passano il criterio 2 (false): ${Y.B.otherPass2.length ? Y.B.otherPass2.join(', ') : 'nessuna'}. Concordanza: ` + Object.entries(Y.B.order).map(([k, v]) => `${k} p ${pf(v.p)}`).join(', ') + '.');
P();
P('**C. Mercati indipendenti**');
P();
const C = Y.C.summary;
P(`${Y.C.rows.length} semi, soglia 20%: concordanza con p < 0,05 in ${C.concBelow05} prove su ${C.tests}, fuori campione in ${C.oosBelow05} su ${C.tests}; coppie con p nullo < 0,05 prima della correzione ${C.pairPNullBelow05} su ${C.pairTests} (${pc(C.pairPNullBelow05 / C.pairTests)}); con quota ≥ 75% e ≥ 8 casi ${C.totalRaw75}; che passano il criterio 2: ${C.totalPass2}.`);
P();
if (Y.C2) P(`C2 (${Y.C2.seeds} semi, soglie 15 e 20%, ${Y.C2.reps} ripetizioni): concordanza con p < 0,05 in ${Y.C2.concBelow05} prove su ${Y.C2.tests} (p < 0,01: ${Y.C2.concBelow01}); fuori campione ${Y.C2.oosBelow05} su ${Y.C2.tests} (p < 0,01: ${Y.C2.oosBelow01}).`);
P();
fs.writeFileSync(path.join(BASE, 'tabelle.md'), out.join('\n'));
console.error('scritto tabelle.md');

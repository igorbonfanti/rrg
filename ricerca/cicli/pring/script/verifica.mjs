#!/usr/bin/env node
/*
 * verifica.mjs — ricalcolo indipendente dei numeri chiave di ricerca/cicli/pring/risultati.json (altro linguaggio, altro
 * codice, legge direttamente i file grezzi in cache/: CSV di FRED e JSON di Yahoo).
 *
 * Rifà: medie mensili dell'S&P 500; punti di svolta a soglia (zigzag scritto in un altro modo: per ogni tratto si cerca
 * il primo mese che conferma il movimento e poi l'estremo del tratto) per obbligazioni, azioni e materie prime alle tre
 * soglie; cicli comuni M2; conteggi delle coppie e dei cicli in ordine perfetto; p-value dello spostamento circolare (con
 * un altro generatore casuale: deve coincidere entro l'errore Monte Carlo); criterio 4 (quote e basi); correlazioni;
 * direzioni di oggi rispetto alla media a 12 mesi. Bry-Boschan non è ricalcolato (vedi sintesi.md).
 *
 * Uso: node ricerca/cicli/pring/script/verifica.mjs [--risultati file.json]   (esce con codice 1 se trova differenze)
 *   --risultati serve alla prova con valori alterati di proposito (vedi sintesi.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '..');
const CACHE = path.join(BASE, 'cache');
const iR = process.argv.indexOf('--risultati');
const R = JSON.parse(fs.readFileSync(iR > 0 ? process.argv[iR + 1] : path.join(BASE, 'risultati.json'), 'utf8'));

const meseDi = (s) => (+s.slice(0, 4) - 1900) * 12 + (+s.slice(5, 7) - 1);
const testo = (m) => `${String(1900 + Math.floor(m / 12)).padStart(4, '0')}-${String((m % 12) + 1).padStart(2, '0')}`;

function fredCsv(id) {
  const righe = fs.readFileSync(path.join(CACHE, `fred_${id}.csv`), 'utf8').trim().split('\n').slice(1);
  const out = new Map();
  for (const r of righe) {
    const [d, v] = r.split(',');
    if (v === '' || v === '.') continue;
    out.set(meseDi(d), +v);
  }
  return out;
}

function spxMensile() {
  const j = JSON.parse(fs.readFileSync(path.join(CACHE, 'yahoo__GSPC.json'), 'utf8'));
  const somma = new Map(), n = new Map();
  for (let i = 0; i < j.dates.length; i++) {
    const m = meseDi(j.dates[i]);
    somma.set(m, (somma.get(m) || 0) + j.close[i]);
    n.set(m, (n.get(m) || 0) + 1);
  }
  const ultimo = meseDi(j.dates[j.dates.length - 1]); // mese in corso: escluso
  const out = new Map();
  for (const [m, s] of somma) if (m < ultimo) out.set(m, s / n.get(m));
  return out;
}

// serie come array ordinato [{m, v}]
const arr = (mp) => [...mp.entries()].sort((a, b) => a[0] - b[0]).map(([m, v]) => ({ m, v }));

/* zigzag, scritto in un altro modo: si parte dall'inizio; si cerca il primo mese in cui la serie si è mossa di almeno
 * la soglia rispetto al massimo o al minimo dall'inizio del tratto; quello decide il primo punto (l'estremo opposto). Poi
 * a ogni tratto si cerca il primo mese che inverte di almeno la soglia rispetto all'estremo corrente del tratto. */
function zz(s, soglia, assoluta) {
  const scesa = (v, ref) => (assoluta ? v <= ref - soglia : v <= ref * (1 - soglia));
  const salita = (v, ref) => (assoluta ? v >= ref + soglia : v >= ref * (1 + soglia));
  const pts = [];
  let i0 = 0;
  // primo punto
  let dir = 0, ext = 0;
  for (let t = 1; t < s.length; t++) {
    let imax = 0, imin = 0;
    for (let k = 1; k <= t; k++) { if (s[k].v > s[imax].v) imax = k; if (s[k].v < s[imin].v) imin = k; }
    if (imax < t && scesa(s[t].v, s[imax].v)) { pts.push({ i: imax, tipo: 1, conf: t }); dir = -1; i0 = t; break; }
    if (imin < t && salita(s[t].v, s[imin].v)) { pts.push({ i: imin, tipo: -1, conf: t }); dir = 1; i0 = t; break; }
  }
  if (!dir) return pts;
  // tratti successivi: l'estremo del tratto è ricalcolato da capo dall'ultimo punto
  for (;;) {
    const start = pts[pts.length - 1].i;
    let trovato = false;
    for (let t = i0; t < s.length; t++) {
      // estremo del tratto da start a t
      let e = start;
      for (let k = start; k <= t; k++) if (dir === 1 ? s[k].v > s[e].v : s[k].v < s[e].v) e = k;
      if (dir === 1 && e < t && scesa(s[t].v, s[e].v)) { pts.push({ i: e, tipo: 1, conf: t }); dir = -1; i0 = t; trovato = true; break; }
      if (dir === -1 && e < t && salita(s[t].v, s[e].v)) { pts.push({ i: e, tipo: -1, conf: t }); dir = 1; i0 = t; trovato = true; break; }
    }
    if (!trovato) break;
  }
  return pts;
}

// ---------------------------------------------------------------- dati
const SER = { obbligazioni: arr(fredCsv('GS10')), azioni: arr(spxMensile()), mp: arr(fredCsv('WPUID62')) };
const SOGLIE = { obbligazioni: [0.75, 1.0, 1.5], azioni: [0.15, 0.2, 0.3], mp: [0.15, 0.2, 0.3] };
const LIV = ['bassa', 'media', 'alta'];
const ORD = ['obbligazioni', 'azioni', 'mp'];
const INI = Math.max(...ORD.map((k) => SER[k][0].m)) + 12;
const FIN = Math.min(...ORD.map((k) => SER[k][SER[k].length - 1].m));

let errori = 0;
const confronta = (nome, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { errori++; console.log(`DIFFERENZA ${nome}: verifica=${JSON.stringify(a)} risultati=${JSON.stringify(b)}`); }
  return ok;
};
confronta('periodo', [testo(INI), testo(FIN)], [R.periodo.inizio_punti, R.periodo.fine]);

// punti nel verso di Pring, con 12 mesi di storia
function punti(k, lv) {
  const s = SER[k];
  const p = zz(s, SOGLIE[k][lv], k === 'obbligazioni').filter((q) => q.i >= 12);
  return p.map((q) => ({ m: s[q.i].m, tipo: k === 'obbligazioni' ? -q.tipo : q.tipo, conf: s[q.conf].m, v: s[q.i].v }));
}
const P = {};
let nPunti = 0;
for (const k of ORD) {
  P[k] = {};
  for (let lv = 0; lv < 3; lv++) {
    P[k][lv] = punti(k, lv);
    const mio = P[k][lv].map((q) => [testo(q.m), q.tipo === 1 ? 'massimo' : 'minimo', testo(q.conf)]);
    const loro = R.punti[k][LIV[lv]].map((q) => [q.mese, q.tipo, q.conferma]);
    confronta(`punti ${k} ${LIV[lv]}`, mio, loro);
    nPunti += mio.length;
  }
}
console.log(`punti di svolta ricalcolati: ${nPunti}`);

// ---------------------------------------------------------------- cicli M2 (scritto da capo)
function cicliM2(pp, finestra = 18) {
  // pp: {serie: [mesi]} ; tutti gli eventi in ordine di (mese, nome serie)
  const ev = [];
  for (const k of Object.keys(pp)) for (const m of pp[k]) ev.push([m, k]);
  ev.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  const usato = new Set();
  const out = [];
  for (const [m, k] of ev) {
    if (usato.has(k + m)) continue;
    usato.add(k + m);
    const c = { [k]: m };
    for (const k2 of Object.keys(pp)) {
      if (k2 === k) continue;
      const cand = pp[k2].filter((x) => x >= m && !usato.has(k2 + x)).sort((a, b) => a - b)[0];
      if (cand !== undefined && cand - m <= finestra) { c[k2] = cand; usato.add(k2 + cand); }
    }
    out.push(c);
  }
  return out;
}
function conta(cicli) {
  const compl = cicli.filter((c) => ORD.every((k) => k in c));
  const perfetti = compl.filter((c) => c.obbligazioni < c.azioni && c.azioni < c.mp).length;
  const coppie = {};
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
    const A = ORD[a], B = ORD[b];
    const casi = cicli.filter((c) => A in c && B in c);
    coppie[`${A}>${B}`] = { n: casi.length, dopo: casi.filter((c) => c[B] > c[A]).length, prima: casi.filter((c) => c[B] < c[A]).length };
  }
  return { cicli: cicli.length, completi: compl.length, perfetti, coppie };
}
const nelPeriodo = (k, lv, tipo, a = INI, b = FIN) => P[k][lv].filter((q) => q.tipo === tipo && q.m >= a && q.m <= b).map((q) => q.m);

for (let lv = 0; lv < 3; lv++) for (const [tipo, nome] of [[1, 'massimi'], [-1, 'minimi']]) {
  const pp = Object.fromEntries(ORD.map((k) => [k, nelPeriodo(k, lv, tipo)]));
  const c = conta(cicliM2(pp));
  const r = R.principale[LIV[lv]].M2[nome];
  confronta(`cicli ${LIV[lv]} ${nome}`, [c.cicli, c.completi, c.perfetti], [r.cicli, r.completi, r.perfetti]);
  for (const cp of Object.keys(c.coppie)) {
    const x = r.coppie[cp];
    confronta(`coppia ${LIV[lv]} ${nome} ${cp}`, [c.coppie[cp].n, c.coppie[cp].dopo, c.coppie[cp].prima], [x.n, x.dopo, x.prima]);
  }
}

// p-value con un altro generatore (xorshift) per le coppie alla soglia media: deve stare entro ±0,03 (≈ 3 errori Monte Carlo)
let seme = 987654321;
const rnd = () => { seme ^= seme << 13; seme >>>= 0; seme ^= seme >>> 17; seme ^= seme << 5; seme >>>= 0; return seme / 4294967296; };
const L = FIN - INI + 1;
const RIP = 2000;
for (const lv of [1]) {
  const tutti = Object.fromEntries(ORD.map((k) => [k, P[k][lv].filter((q) => q.m >= INI && q.m <= FIN)]));
  const oss = {};
  for (const [tipo, nome] of [[1, 'massimi'], [-1, 'minimi']]) {
    const c = conta(cicliM2(Object.fromEntries(ORD.map((k) => [k, tutti[k].filter((q) => q.tipo === tipo).map((q) => q.m)]))));
    for (const cp of Object.keys(c.coppie)) oss[`${nome} ${cp}`] = c.coppie[cp].dopo - c.coppie[cp].prima;
  }
  const ge = Object.fromEntries(Object.keys(oss).map((k) => [k, 0]));
  for (let r = 0; r < RIP; r++) {
    const sp = {};
    for (const k of ORD) { const s = Math.floor(rnd() * L); sp[k] = tutti[k].map((q) => ({ m: ((q.m - INI + s) % L) + INI, tipo: q.tipo })); }
    for (const [tipo, nome] of [[1, 'massimi'], [-1, 'minimi']]) {
      const c = conta(cicliM2(Object.fromEntries(ORD.map((k) => [k, sp[k].filter((q) => q.tipo === tipo).map((q) => q.m).sort((a, b) => a - b)]))));
      for (const cp of Object.keys(c.coppie)) if (c.coppie[cp].dopo - c.coppie[cp].prima >= oss[`${nome} ${cp}`]) ge[`${nome} ${cp}`]++;
    }
  }
  for (const key of Object.keys(oss)) {
    const p = (1 + ge[key]) / (1 + RIP);
    const [nome, cp] = key.split(' ');
    const loro = R.principale[LIV[lv]].M2[nome].coppie[cp].p;
    const ok = Math.abs(p - loro) <= 0.03;
    if (!ok) { errori++; console.log(`DIFFERENZA p ${LIV[lv]} ${key}: verifica=${p.toFixed(3)} risultati=${loro}`); }
    else console.log(`p ${LIV[lv]} ${key}: verifica ${p.toFixed(3)}, risultati ${loro.toFixed(3)}`);
  }
}

// ---------------------------------------------------------------- criterio 4: quote e basi (tutto il campione)
for (let lv = 0; lv < 3; lv++) for (const [tipo, nome] of [[1, 'massimi'], [-1, 'minimi']]) for (const [g, s] of [['obbligazioni', 'azioni'], ['azioni', 'mp'], ['obbligazioni', 'mp']]) {
  const ultimo = FIN - 24;
  const ps = P[s][lv].filter((q) => q.tipo === tipo).map((q) => q.m);
  const casi = P[g][lv].filter((q) => q.tipo === tipo && q.conf >= INI && q.conf <= ultimo);
  const colti = casi.filter((q) => ps.some((m) => m > q.conf && m <= q.conf + 18)).length;
  let b = 0, nb = 0;
  for (let m = INI; m <= ultimo; m++) { nb++; if (ps.some((x) => x > m && x <= m + 18)) b++; }
  const r = R.criterio4.find((x) => x.soglia === LIV[lv] && x.tipo === nome && x.coppia === `${g}>${s}`);
  confronta(`criterio4 ${LIV[lv]} ${nome} ${g}>${s}`, [casi.length, colti, (b / nb).toFixed(4)], [r.n, r.colti, r.base.toFixed(4)]);
}

// ---------------------------------------------------------------- correlazioni e oggi
function corr(x, y) {
  const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
const spx = new Map(SER.azioni.map((q) => [q.m, q.v])), gs = new Map(SER.obbligazioni.map((q) => [q.m, q.v]));
const xa = [], xb = [], xa2 = [], xb2 = [];
for (const [m, v] of spx) {
  if (!spx.has(m - 1) || !gs.has(m) || !gs.has(m - 1)) continue;
  const a = Math.log(v / spx.get(m - 1)), b = -(gs.get(m) - gs.get(m - 1));
  if (m < meseDi('2000-01')) { xa.push(a); xb.push(b); } else { xa2.push(a); xb2.push(b); }
}
confronta('correlazione azioni-obbligazioni fino al 1999', corr(xa, xb).toFixed(4), R.correlazione_azioni_obbligazioni.fino_1999.toFixed(4));
confronta('correlazione azioni-obbligazioni dal 2000', corr(xa2, xb2).toFixed(4), R.correlazione_azioni_obbligazioni.dal_2000.toFixed(4));

// direzioni di oggi rispetto alla media a 12 mesi
for (const k of ORD) {
  const s = SER[k];
  const ult = s.slice(-12);
  const mm = ult.reduce((a, q) => a + q.v, 0) / 12;
  const su = k === 'obbligazioni' ? s[s.length - 1].v < mm : s[s.length - 1].v > mm;
  confronta(`direzione mm12 ${k}`, su ? 1 : -1, R.stadi.mm12.direzioni_ultimo_mese[k]);
}

console.log(errori ? `${errori} differenze` : '0 differenze');
process.exit(errori ? 1 : 0);

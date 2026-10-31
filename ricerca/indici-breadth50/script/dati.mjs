// Affidabilità della breadth a 50 e a 20 sedute degli indici (e dei settori) per un backtest sui minimi locali.
// Parte senza rete: copertura, buchi, sedute ricopiate, titoli «giovani» nel denominatore, coerenza interna, allineamento
// delle date con il prezzo, salti di un giorno; più il confronto con i valori S&P 500 pubblicati da First Trust (fonte
// Bloomberg) in post pubblici, trascritti qui sotto con l'indirizzo.
// I ricalcoli dai prezzi dei membri sono in ricalcolo.mjs, il bias dei membri di oggi in bias.mjs.
// Uso: node ricerca/indici-breadth50/script/dati.mjs     (scrive le sezioni copertura, settori, fonteEsterna di dati.json)
import { loadAll, loadSectors, saveSection, r1, r2, median, quantile, corr, days, read } from './lib.mjs';

const { cfg, raw, S } = loadAll();

// Pasqua (calendario gregoriano) per riconoscere Venerdì santo e Lunedì dell'Angelo
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}
const iso = (t) => new Date(t).toISOString().slice(0, 10);
function holidayLike(d) {
  const md = d.slice(5), y = +d.slice(0, 4), E = easter(y);
  if (md >= '12-24' || md <= '01-02') return 'fine anno';
  if (d === iso(E - 2 * 864e5)) return 'Venerdì santo';
  if (d === iso(E + 864e5)) return 'Lunedì dell\'Angelo';
  if (md === '05-01') return '1° maggio';
  return null;
}

function analyse(s, { oggi = false, close = null } = {}) {
  const L = s.dates.length;
  const idx = []; for (let i = 0; i < L; i++) if (s.pct50[i] != null) idx.push(i);
  if (!idx.length) return null;
  const i0 = idx[0], iL = idx.at(-1);
  const cl = close || s.close;
  // buchi: sedute del calendario senza breadth, intervalli lunghi tra sedute
  let nullInside = 0; for (let i = i0; i <= iL; i++) if (s.pct50[i] == null) nullInside++;
  const longGaps = [];
  for (let i = i0 + 1; i <= iL; i++) { const g = days(s.dates[i - 1], s.dates[i]); if (g > 5) longGaps.push(`${s.dates[i - 1]} → ${s.dates[i]} (${g} giorni)`); }
  const perYear = {};
  for (const i of idx) { const y = s.dates[i].slice(0, 4); (perYear[y] ||= { sedute: 0, cov: [], n: [] }); perYear[y].sedute++; perYear[y].cov.push(s.n[i] / s.members[i]); perYear[y].n.push(s.n[i]); }
  const years = Object.fromEntries(Object.entries(perYear).map(([y, v]) => [y, { sedute: v.sedute, nMin: Math.min(...v.n), nMediana: median(v.n), copMin: r2(Math.min(...v.cov)), copMediana: r2(median(v.cov)) }]));
  // anni (completi, tranne il primo e l'ultimo) con meno sedute del solito: possibili sedute mancanti nel prezzo di Yahoo
  const ys = Object.keys(years).sort(), full = ys.slice(1, -1), medSed = median(full.map((y) => years[y].sedute));
  const fewSessions = full.filter((y) => years[y].sedute < medSed - 8).map((y) => `${y}: ${years[y].sedute}`);
  // cali temporanei della copertura: n sotto il 90% della mediana delle 21 sedute intorno
  const dips = [];
  for (const i of idx) {
    const w = []; for (let k = Math.max(i0, i - 10); k <= Math.min(iL, i + 10); k++) if (s.n[k] != null) w.push(s.n[k]);
    const m = median(w); if (s.n[i] < 0.9 * m) dips.push({ date: s.dates[i], n: s.n[i], mediana: m });
  }
  // sedute ricopiate: conteggi identici alla seduta prima (n, a20, a50, a200)
  const same = [], sameClose = [], closeEq = [];
  for (const i of idx) {
    if (i === i0) continue;
    const p = i - 1; if (s.n[p] == null) continue;
    const eqC = cl[i] === cl[p];
    if (eqC) closeEq.push(s.dates[i]);
    if (s.n[i] === s.n[p] && s.above200[i] === s.above200[p] && s.pct50[i] === s.pct50[p] && s.pct20[i] === s.pct20[p]) {
      same.push(s.dates[i]); if (eqC) sameClose.push(s.dates[i]);
    }
  }
  const nMed = median(idx.map((i) => s.n[i]));
  // titoli giovani (solo membri di oggi, lista fissa): ogni nuovo massimo di n è un titolo con prezzi che iniziano lì;
  // per 49 sedute conta in n senza poter essere sopra la media a 50, per 199 senza poter essere sopra la 200
  let young = null;
  if (oggi) {
    const mx = []; let m = 0; for (const i of idx) { m = Math.max(m, s.n[i]); mx.push(m); }
    const share = (w) => idx.map((i, k) => (k >= w ? (mx[k] - mx[k - w]) / s.n[i] : null));
    const y50 = share(49), y200 = share(199);
    const at = (arr, f) => { let b = -1; arr.forEach((v, k) => { if (v != null && (b < 0 || v > arr[b])) b = k; }); return b < 0 ? null : { quota: r1(100 * arr[b]), data: s.dates[idx[b]] }; };
    const after = (arr, yr) => arr.filter((v, k) => v != null && s.dates[idx[k]] >= yr);
    young = {
      metodo: 'nuovi massimi di n nelle ultime 49 (199) sedute, in % di n; le prime 49 (199) sedute della serie non si misurano',
      max50: at(y50), max200: at(y200),
      mediana50: r1(100 * median(y50)), mediana200: r1(100 * median(y200)),
      sedute50sopra5: y50.filter((v) => v != null && v > 0.05).length,
      sedute200sopra10: y200.filter((v) => v != null && v > 0.10).length,
      nInizio: s.n[i0], nFine: s.n[iL], membri: s.members[iL],
    };
  }
  // coerenza: valori impossibili
  const bad = [];
  for (const i of idx) {
    const a50 = (s.pct50[i] * s.n[i]) / 100, a20 = (s.pct20[i] * s.n[i]) / 100;
    if (s.n[i] > s.members[i] || s.above200[i] > s.n[i] || a50 > s.n[i] + 1e-9 || a20 > s.n[i] + 1e-9 || s.above200[i] < 0 || a50 < -1e-9 || a20 < -1e-9) bad.push(s.dates[i]);
  }
  // allineamento con il prezzo: correlazione tra variazione della breadth e rendimento dell'indice, stesso giorno e sfasati
  const ret = cl.map((c, i) => (i && cl[i - 1] && c != null ? c / cl[i - 1] - 1 : null));
  const d20 = s.pct20.map((v, i) => (i && v != null && s.pct20[i - 1] != null ? v - s.pct20[i - 1] : null));
  const d50 = s.pct50.map((v, i) => (i && v != null && s.pct50[i - 1] != null ? v - s.pct50[i - 1] : null));
  const lag = (a, k) => a.map((_, i) => (i + k >= 0 && i + k < a.length ? a[i + k] : null));
  const align = { d20_ret0: r2(corr(d20, ret)), d20_retPrima: r2(corr(d20, lag(ret, -1))), d20_retDopo: r2(corr(d20, lag(ret, 1))), d50_ret0: r2(corr(d50, ret)) };
  // salti di un giorno: |Δ pct50| in punti, e i casi con il prezzo quasi fermo o di segno opposto
  const jumps = [];
  for (const i of idx) if (d50[i] != null) jumps.push({ i, d: d50[i], r: ret[i], dn: s.n[i] - s.n[i - 1] });
  const absd = jumps.map((x) => Math.abs(x.d));
  const p99 = quantile(absd, 0.99);
  const big = jumps.filter((x) => Math.abs(x.d) >= Math.max(20, p99));
  const p98 = quantile(absd, 0.98);
  const odd = jumps.filter((x) => Math.abs(x.d) >= Math.max(15, p98) && x.r != null && (Math.abs(x.r) < 0.003 || Math.sign(x.r) !== Math.sign(x.d)));
  const fmtJ = (x) => ({ data: s.dates[x.i], dPct50: r1(x.d), rendimento: r2(100 * x.r), dN: x.dn });
  const nJump = jumps.filter((x) => Math.abs(x.dn) >= Math.max(2, 0.05 * s.n[x.i - 1]));
  // valori costanti: serie più lunga di pct50 identica
  let best = { len: 1 }, cur = 1;
  for (let k = 1; k < idx.length; k++) {
    const i = idx[k], p = idx[k - 1];
    cur = s.pct50[i] === s.pct50[p] ? cur + 1 : 1;
    if (cur > best.len) best = { len: cur, fine: s.dates[i], valore: r1(s.pct50[i]) };
  }
  // relazioni tra le tre breadth
  const gap2050 = idx.map((i) => s.pct20[i] - s.pct50[i]), gap50200 = idx.map((i) => s.pct50[i] - s.pct200[i]);
  const imax = (arr) => { let b = 0; arr.forEach((v, k) => { if (Math.abs(v) > Math.abs(arr[b])) b = k; }); return { valore: r1(arr[b]), data: s.dates[idx[b]] }; };
  return {
    breadthDal: s.dates[i0], breadthAl: s.dates[iL], prezzoAl: s.dates[L - 1], sedute: idx.length, senzaBreadthDentro: nullInside,
    intervalliLunghi: longGaps, anniConPocheSedute: fewSessions, sedutePerAnnoMediana: medSed,
    membri: { primo: s.members[i0], ultimo: s.members[iL] }, nMediana: nMed, nMin: Math.min(...idx.map((i) => s.n[i])),
    copertura: { inizio: r2(s.n[i0] / s.members[i0]), fine: r2(s.n[iL] / s.members[iL]),
      sedutaSotto60: idx.filter((i) => s.n[i] / s.members[i] < 0.6).length, sedutaSotto80: idx.filter((i) => s.n[i] / s.members[i] < 0.8).length,
      primaSopra80: (() => { const i = idx.find((i) => s.n[i] / s.members[i] >= 0.8); return i == null ? null : s.dates[i]; })(),
      primaSopra90: (() => { const i = idx.find((i) => s.n[i] / s.members[i] >= 0.9); return i == null ? null : s.dates[i]; })() },
    caliCopertura: { sedute: dips.length, esempi: dips.slice(0, 12) },
    ricopiate: { conteggiUguali: same.length, conPrezzoUguale: sameClose.length, prezzoUguale: closeEq.length,
      festeTipiche: same.filter((d) => holidayLike(d)).length, esempi: same.slice(-15) },
    giovani: young, valoriImpossibili: bad.length, allineamento: align,
    salti: { p99: r1(p99), max: r1(Math.max(...absd)), grandi: big.length, strani: odd.length, esempiStrani: odd.sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 8).map(fmtJ),
      saltiDiN: nJump.length, esempiSaltiDiN: nJump.slice(0, 10).map(fmtJ) },
    pct50Costante: best,
    relazioni: { pct20MenoPct50: { p1: r1(quantile(gap2050, 0.01)), p99: r1(quantile(gap2050, 0.99)), estremo: imax(gap2050) },
      pct50MenoPct200: { p1: r1(quantile(gap50200, 0.01)), p99: r1(quantile(gap50200, 0.99)), estremo: imax(gap50200) },
      corr20_50: r2(corr(idx.map((i) => s.pct20[i]), idx.map((i) => s.pct50[i]))), corr50_200: r2(corr(idx.map((i) => s.pct50[i]), idx.map((i) => s.pct200[i]))) },
  };
}

const copertura = {};
for (const k of Object.keys(cfg)) copertura[k] = { nome: cfg[k].name, composizione: cfg[k].composition, limiti: !!cfg[k].limits, ...analyse(S[k], { oggi: cfg[k].composition === 'oggi' }) };

// settori (data/breadth.json) con il prezzo degli ETF (sectors.json, rettificato) solo per l'allineamento
const { br, sec, S: SS } = loadSectors();
const settori = {};
for (const k of Object.keys(SS)) {
  const m = new Map(sec.dates.map((d, i) => [d, sec.adjclose[k] ? sec.adjclose[k][i] : null]));
  const spx = S.SPX, mm = new Map(spx.dates.map((d, i) => [d, spx.close[i]]));
  const close = br.dates.map((d) => (k === 'SPX' ? mm.get(d) : m.get(d)) ?? null);
  settori[k] = analyse(SS[k], { close });
}

// ---------- confronto con valori pubblicati (S&P 500, First Trust su dati Bloomberg) ----------
// Valori interi alla chiusura indicata nel post. Le righe «intraday» sono letture durante la seduta: si confrontano con la
// chiusura prima e con quella del giorno, solo come indicazione.
const FT = [
  { data: '2018-05-09', p50: 44, p200: 51, url: 'https://www.ftportfolios.com/Blogs/MarketBlog/2018/5/10/a-snapshot-of-moving-averages' },
  { data: '2018-09-12', p50: 62, p200: 63, url: 'https://www.ftportfolios.com/blogs/MarketBlog/2018/9/13/a-snapshot-of-moving-averages' },
  { data: '2019-08-12', p50: 36, p200: 54, url: 'https://www.ftportfolios.com/blogs/MarketBlog/2019/8/13/a-snapshot-of-moving-averages' },
  { data: '2019-10-11', p50: 61, p200: 62, url: 'https://www.ftportfolios.com/Blogs/MarketBlog/2019/10/15/a-snapshot-of-moving-averages' },
  { data: '2020-08-31', p50: 75, p200: 61, url: 'https://www.ftportfolios.com/blogs/MarketBlog/2020/9/1/a-snapshot-of-moving-averages' },
  { data: '2018-02-16', p50: 46, p200: 69, incerta: 'data dei valori non scritta (post del 20/02/2018, «On 2/16/18» per i cali)', url: 'https://www.ftportfolios.com/blogs/MarketBlog/2018/2/20/a-snapshot-of-moving-averages' },
  { data: '2017-05-15', p50: 57, p200: 70, incerta: 'data non scritta: post del 16/05/2017 alle 12:37, si usa la chiusura del 15/05', url: 'https://www.ftportfolios.com/blogs/MarketBlog/2017/5/16/a-snapshot-of-moving-averages' },
  { data: '2020-05-05', p50: 64, p200: 24, incerta: 'intraday, 9:33 CST del 05/05/2020', url: 'https://www.ftportfolios.com/blogs/MarketBlog/2020/5/5/a-snapshot-of-moving-averages' },
  { data: '2021-09-20', p50: 27, p200: 61, incerta: 'intraday, 12:00 CST del 20/09/2021', url: 'https://ftportfolios.com/Commentary/MarketCommentary/2021/9/21/a-snapshot-of-moving-averages' },
];
// estremi dei settori a 50 sedute nello stesso post (solo i settori con la stessa definizione GICS di oggi)
const FTsec = [
  { data: '2018-05-09', min: ['XLP', 18], max: ['XLE', 97] },
  { data: '2019-08-12', min: ['XLE', 18], max: ['XLU', 57] },
  { data: '2019-10-11', min: ['XLE', 36], max: ['XLU', 75] },
  { data: '2020-08-31', min: ['XLE', 27], max: ['XLI', 92] },
  { data: '2016-10-24', min: ['XLU', 3], max: ['XLE', 66], url: 'https://www.ftportfolios.com/Blogs/MarketBlog/2016/10/25/a-snapshot-of-moving-averages' },
];
const pos = new Map(br.dates.map((d, i) => [d, i]));
const spx = SS.SPX;
const fonte = FT.map((x) => {
  const i = pos.get(x.data);
  const row = { ...x, app50: r1(spx.pct50[i]), app200: r1(spx.pct200[i]), diff50: r1(spx.pct50[i] - x.p50), diff200: r1(spx.pct200[i] - x.p200) };
  if (x.incerta) { const p = i - 1; row.app50Prima = r1(spx.pct50[p]); row.app200Prima = r1(spx.pct200[p]); }
  return row;
});
const clean = fonte.filter((x) => !x.incerta);
const fonteSettori = FTsec.map((x) => {
  const i = pos.get(x.data), vals = Object.fromEntries(Object.keys(SS).filter((k) => k !== 'SPX').map((k) => [k, r1(SS[k].pct50[i])]));
  const sorted = Object.entries(vals).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1]);
  return { data: x.data, pubblicato: { min: x.min, max: x.max }, app: { [x.min[0]]: vals[x.min[0]], [x.max[0]]: vals[x.max[0]] },
    appMin: sorted[0], appMax: sorted.at(-1), nota: 'nell\'app ci sono 11 settori GICS di oggi; nel post anche Telecom (prima del 2018)' };
});
const fonteEsterna = {
  fonte: 'First Trust Portfolios, «A Snapshot of Moving Averages» (dati Bloomberg), valori interi; trascritti a mano dai post pubblici, nessuno scraping',
  sp500: fonte,
  riassunto: { date: clean.length, diff50: clean.map((x) => x.diff50), mediaAss50: r1(clean.reduce((a, x) => a + Math.abs(x.diff50), 0) / clean.length),
    maxAss50: Math.max(...clean.map((x) => Math.abs(x.diff50))), diff200: clean.map((x) => x.diff200), mediaAss200: r1(clean.reduce((a, x) => a + Math.abs(x.diff200), 0) / clean.length) },
  settori50: fonteSettori,
  nota: 'Bloomberg può usare chiusure diverse (dividendi, eventi straordinari) e arrotonda all\'intero: scarti di 1-2 punti sono attesi.',
};

saveSection('copertura', copertura);
saveSection('settori', settori);
saveSection('fonteEsterna', fonteEsterna);

// riassunto a schermo
const pad = (x, n) => String(x ?? '—').padEnd(n);
console.log(pad('indice', 9), pad('dal', 11), pad('nMed', 6), pad('cop0', 5), pad('>80%', 11), pad('ugual', 6), pad('feste', 6), pad('cali', 5), pad('y50max', 13), pad('corr0/-1/+1', 18), pad('strani', 6), 'buchi');
for (const [k, v] of Object.entries(copertura)) {
  console.log(pad(k, 9), pad(v.breadthDal, 11), pad(v.nMediana, 6), pad(v.copertura.inizio, 5), pad(v.copertura.primaSopra80, 11), pad(v.ricopiate.conteggiUguali, 6), pad(v.ricopiate.festeTipiche, 6), pad(v.caliCopertura.sedute, 5),
    pad(v.giovani ? `${v.giovani.max50.quota}% ${v.giovani.max50.data.slice(0, 7)}` : '', 13), pad(`${v.allineamento.d20_ret0}/${v.allineamento.d20_retPrima}/${v.allineamento.d20_retDopo}`, 18), pad(v.salti.strani, 6), v.intervalliLunghi.length + ' ' + v.anniConPocheSedute.join(','));
}
for (const [k, v] of Object.entries(settori)) console.log('settore', pad(k, 5), pad(v.breadthDal, 11), 'nMin', v.nMin, 'ugual', v.ricopiate.conteggiUguali, 'cali', v.caliCopertura.sedute, 'corr', v.allineamento.d20_ret0, v.allineamento.d20_retPrima, v.allineamento.d20_retDopo, 'strani', v.salti.strani);
console.log('First Trust:', fonteEsterna.riassunto);
for (const x of fonte) console.log(x.data, x.p50, x.app50, x.p200, x.app200, x.incerta ? `(prima: ${x.app50Prima}/${x.app200Prima}) ${x.incerta}` : '');
for (const x of fonteSettori) console.log(x.data, JSON.stringify(x.pubblicato), JSON.stringify(x.app), JSON.stringify(x.appMin), JSON.stringify(x.appMax));

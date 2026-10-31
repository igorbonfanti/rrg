#!/usr/bin/env node
/*
 * pine_zone_blu.mjs — genera l'indicatore TradingView (Pine Script v6) con le zone blu, i trigger e i segnali falliti
 * di Sector Monitor, calcolati con le stesse funzioni e gli stessi dati dell'app (runMachine in js/signals.js, livelli
 * blu di default). L'indicatore non ricalcola niente: disegna le date dell'app sul grafico dell'ETF del settore o
 * dell'indice. Le zone nuove compaiono solo rigenerando il file e reincollandolo in TradingView.
 * Uso: node scripts/pine_zone_blu.mjs   →   pine/sector-monitor-zone-blu.pine
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { breadthSeries, priceSeries, runMachine, DEFAULT_PARAMS, SECTOR_KEYS } from '../js/signals.js';
import { indexSeries } from '../js/indexdata.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
// ticker di TradingView (syminfo.ticker, senza la borsa) di ogni serie: per gli indici quelli dei link della Situazione
// (js/indices.js, TV), senza le serie di breadth (S5TH, NDTH…); per l'S&P 500 anche SPY
const TICKERS = {
  SPX: ['SPX', 'SPY'], NDX: ['NDX'], DJI: ['DJI'], N225: ['NI225'], SXXP: ['SXXP'], UKX: ['UKX'], DAX: ['DAX'], CAC: ['PX1'], SMI: ['SMI'],
  RUT: ['RUT'], TSX60: ['TX60', 'XIU'], SX5E: ['SX5E'], FTSEMIB: ['FTSEMIB'], IBEX: ['IBC'], HSI: ['HSI'], CSI300: ['000300', '510300'],
  KOSPI200: ['KOSPI200', 'KOSPI'], TWN: ['TAIEX', 'EWT'], NIFTY50: ['NIFTY'], ASX200: ['XJO'], EEM: ['EEM'], IBOV: ['IBOV'],
};
const ymd = (d) => d.replaceAll('-', '');

/** Zone blu (sedute in zona blu o del segnale fallito, come le bande del grafico dell'app), trigger e falliti. */
export function zones(dates, m) {
  const z = [];
  let s = null;
  for (let i = 0; i <= dates.length; i++) {
    const on = i < dates.length && (m.days[i] === 'setup' || m.days[i] === 'fail');
    if (on && s == null) s = i;
    if (!on && s != null) { z.push([dates[s], dates[i - 1]]); s = null; }
  }
  const ev = (code) => m.events.filter((e) => e.code === code).map((e) => dates[e.t]);
  return { zones: z, trig: ev('trig'), fail: ev('fail') };
}

function build() {
  const thr = read('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...thr.params };
  const sec = read('data/sectors.json'), br = read('data/breadth.json');
  const out = [];
  for (const s of SECTOR_KEYS) {
    const m = runMachine(priceSeries(sec.adjclose[s]), breadthSeries(br, s, sec.dates), thr.blue[s], P);
    out.push({ key: s, tickers: [s], blue: thr.blue[s], src: 'Rea', ...zones(sec.dates, m) });
  }
  const cfg = read('config/indices.json').indices;
  const ix = { ...read('data/indices_more.json').series, ...read('data/indices.json').series };
  for (const k of Object.keys(TICKERS)) {
    if (!ix[k] || !cfg[k]) continue;
    const S = indexSeries(ix[k]);
    const m = runMachine(priceSeries(S.close), S, cfg[k].blue, P);
    out.push({ key: k, tickers: TICKERS[k], blue: cfg[k].blue, src: cfg[k].blueSource === 'Rea' ? 'Rea' : 'p3', name: cfg[k].name, ...zones(S.dates, m) });
  }
  return { asOf: br.asOf, series: out };
}

function pine({ asOf, series }) {
  const q = (s) => `"${s}"`;
  const z = (x) => x.zones.map(([a, b]) => `${ymd(a)}-${ymd(b)}`).join(' ');
  const d = (a) => a.map(ymd).join(' ');
  const [y, mo, da] = asOf.split('-');
  return `//@version=6
// Sector Monitor · zone blu (https://igorbonfanti.github.io/rrg/)
// Generato da scripts/pine_zone_blu.mjs con i dati al ${da}/${mo}/${y}: zone blu, trigger e segnali falliti dell'app, con i livelli
// blu di default. L'indicatore non ricalcola niente: per le zone nuove si rigenera il file e lo si reincolla in TradingView.
// Funziona sui grafici degli ETF settoriali (XLK … XLU) e degli indici della vista 6 (SPX o SPY, NDX, DJI, NI225, DAX …).
// Livelli blu: per i settori dalla tabella «200 LEVEL SETTORI» di Massimo Rea (quant-rea); per gli indici dai grafici di Rea
// dove ci sono, altrimenti il 3° percentile della breadth dell'indice. Regole di zona blu, trigger e fallimento di Sector
// Monitor (guida: https://igorbonfanti.github.io/rrg/guida.html). Storia ricostruita: non è un backtest validato né un
// consiglio di investimento.
indicator("Sector Monitor · zone blu", "SM zone blu", overlay = true)

string key = switch syminfo.ticker
${series.flatMap((x) => x.tickers.map((t) => `    ${q(t)} => ${q(x.key)}`)).join('\n')}
    => ""

string zoneStr = switch key
${series.map((x) => `    ${q(x.key)} => ${q(z(x))}`).join('\n')}
    => ""
string trigStr = switch key
${series.map((x) => `    ${q(x.key)} => ${q(d(x.trig))}`).join('\n')}
    => ""
string failStr = switch key
${series.map((x) => `    ${q(x.key)} => ${q(d(x.fail))}`).join('\n')}
    => ""
int blue = switch key
${series.map((x) => `    ${q(x.key)} => ${x.blue}`).join('\n')}
    => 0
string blueSrc = switch key
${series.map((x) => `    ${q(x.key)} => ${q(x.src === 'Rea' ? 'Massimo Rea, quant-rea' : '3° percentile della breadth')}`).join('\n')}
    => ""

// date AAAAMMGG del primo e dell'ultimo giorno della barra, nel fuso della borsa (funziona anche su settimanale e mensile)
ymd(int t) => year(t, syminfo.timezone) * 10000 + month(t, syminfo.timezone) * 100 + dayofmonth(t, syminfo.timezone)
int d0 = ymd(time)
int d1 = ymd(na(time_close) ? time : time_close - 1)

var array<int> zs = array.new<int>()
var array<int> ze = array.new<int>()
var array<int> tg = array.new<int>()
var array<int> fl = array.new<int>()
if barstate.isfirst
    for p in str.split(zoneStr, " ")
        ab = str.split(p, "-")
        if ab.size() == 2
            zs.push(int(str.tonumber(ab.get(0))))
            ze.push(int(str.tonumber(ab.get(1))))
    for p in str.split(trigStr, " ")
        if str.length(p) == 8
            tg.push(int(str.tonumber(p)))
    for p in str.split(failStr, " ")
        if str.length(p) == 8
            fl.push(int(str.tonumber(p)))

inside(array<int> a, int lo, int hi) =>
    bool hit = false
    for v in a
        if v >= lo and v <= hi
            hit := true
    hit

bool inZone = false
for [i, s] in zs
    if s <= d1 and ze.get(i) >= d0
        inZone := true
bool isTrig = inside(tg, d0, d1)
bool isFail = inside(fl, d0, d1)

bgcolor(inZone ? color.new(#3b82f6, 78) : na, title = "Zona blu")
plotshape(isTrig, "Trigger", shape.triangleup, location.belowbar, #22c55e, text = "T", textcolor = #22c55e, size = size.small)
plotshape(isFail, "Segnale fallito", shape.xcross, location.abovebar, #ef4444, text = "F", textcolor = #ef4444, size = size.small)

var table info = table.new(position.top_right, 1, 1)
if barstate.islast
    string msg = key == "" ? "Sector Monitor: simbolo non coperto (usa XLK … XLU o un indice della vista 6)" : "Sector Monitor · " + key + " · livello blu " + str.tostring(blue) + "% (" + blueSrc + ") · zone dell'app al ${da}/${mo}/${y}"
    table.cell(info, 0, 0, msg, text_color = color.white, bgcolor = color.new(color.gray, 30), text_size = size.small)
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = build();
  const dir = path.join(ROOT, 'pine');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'sector-monitor-zone-blu.pine');
  fs.writeFileSync(file, pine(data));
  for (const x of data.series) console.log(`${x.key.padEnd(8)} ${String(x.zones.length).padStart(3)} zone blu, ${String(x.trig.length).padStart(3)} trigger, ${String(x.fail.length).padStart(2)} falliti${x.zones.length ? `, ultima zona ${x.zones.at(-1).join(' → ')}` : ''}`);
  console.log(`Scritto ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1024).toFixed(1)} KB), dati al ${data.asOf}`);
}

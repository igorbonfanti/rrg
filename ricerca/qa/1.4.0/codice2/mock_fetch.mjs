// mock_fetch.mjs — precaricato con `node --import` per simulare le corse di scripts/fetch_emerging.js senza toccare il codice.
// MOCK (lista separata da virgole):
//   rec        registra le risposte vere in $MOCK_CACHE (chiave: serie FRED o simbolo Yahoo + coda/lunga)
//   replay     risponde dalla cache (nessuna rete)
//   fred503    FRED risponde HTTP 503 (errore veloce)
//   fredhang   FRED non risponde (la richiesta resta appesa fino al timeout di 30 s dello script)
//   yahoo503   Yahoo risponde HTTP 503
//   yahooempty la coda di Yahoo dei cambi arriva vuota (nessuna barra)
//   yahoostale la coda di Yahoo dei cambi si ferma 20 giorni prima
//   fedshort=ID la serie FRED ID arriva solo dal 2015 (storia accorciata)
//   fedlag=ID  la serie FRED ID si ferma 30 giorni prima (Fed indietro)
import fs from 'node:fs';
import path from 'node:path';

const MODE = new Set((process.env.MOCK || '').split(',').filter(Boolean));
const arg = (k) => [...MODE].filter((m) => m.startsWith(k + '=')).map((m) => m.slice(k.length + 1));
const CACHE = process.env.MOCK_CACHE;
const realFetch = globalThis.fetch;
const log = (...a) => { if (process.env.MOCK_LOG) console.error('[mock]', ...a); };

function keyOf(url) {
  const u = new URL(url);
  if (u.hostname.includes('stlouisfed')) return { src: 'fred', key: 'fred_' + u.searchParams.get('id') };
  const sym = decodeURIComponent(u.pathname.split('/').pop());
  const p1 = Number(u.searchParams.get('period1'));
  const tail = p1 > Date.parse('2020-01-01') / 1000;
  return { src: 'yahoo', key: 'yahoo_' + sym.replace(/[^\w]/g, '_') + (tail ? '_tail' : '_long'), sym, tail };
}
const resp = (status, body, type = 'application/json') => new Response(body, { status, headers: { 'content-type': type } });
// una connessione appesa tiene vivo il processo (come un socket vero): senza il timer Node uscirebbe subito, perché il
// timer di AbortSignal.timeout non lo tiene acceso
const hang = (signal) => new Promise((_, rej) => {
  const keep = setInterval(() => {}, 1000);
  if (signal) signal.addEventListener('abort', () => { clearInterval(keep); rej(signal.reason || Object.assign(new Error('timeout'), { name: 'TimeoutError' })); });
});

globalThis.fetch = async (url, opt = {}) => {
  const k = keyOf(String(url));
  log(k.key);
  if (k.src === 'fred' && MODE.has('fred503')) return resp(503, 'down', 'text/plain');
  if (k.src === 'fred' && MODE.has('fredhang')) return hang(opt.signal);
  if (k.src === 'yahoo' && MODE.has('yahoo503')) return resp(503, 'down');
  const file = CACHE && path.join(CACHE, k.key + '.txt');
  let body;
  if (MODE.has('replay')) {
    if (!fs.existsSync(file)) return resp(404, 'not cached');
    body = fs.readFileSync(file, 'utf8');
  } else {
    const r = await realFetch(url, opt);
    body = await r.text();
    if (!r.ok) return resp(r.status, body);
    if (MODE.has('rec') && CACHE) fs.writeFileSync(file, body);
  }
  if (k.src === 'fred') {
    const id = k.key.slice(5);
    let lines = body.trim().split(/\r?\n/);
    if (arg('fedshort').includes(id)) lines = [lines[0], ...lines.slice(1).filter((l) => l.slice(0, 4) >= '2015')];
    if (arg('fedlag').includes(id)) { const n = lines.length; lines = lines.slice(0, n - 22); }
    return resp(200, lines.join('\n') + '\n', 'text/csv');
  }
  if (k.src === 'yahoo' && k.tail && (MODE.has('yahooempty') || MODE.has('yahoostale'))) {
    const j = JSON.parse(body), r = j.chart.result[0];
    const cut = MODE.has('yahooempty') ? 0 : Math.max(0, r.timestamp.length - 20 - 5);
    const sl = (a) => (Array.isArray(a) ? a.slice(0, cut) : a);
    r.timestamp = r.timestamp.slice(0, cut);
    for (const q of r.indicators.quote) for (const f of Object.keys(q)) q[f] = sl(q[f]);
    if (r.indicators.adjclose) for (const q of r.indicators.adjclose) q.adjclose = sl(q.adjclose);
    return resp(200, JSON.stringify(j));
  }
  return resp(200, body);
};

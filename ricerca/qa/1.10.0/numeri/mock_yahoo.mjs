// Preload per provare scripts/fetch_ath.js senza rete: serve le risposte di Yahoo salvate da verifica_ath.py
// (ricerca/qa/1.10.0/numeri/cache/Y_*.json). Variabili:
//   MOCK_FAIL=SYM,SYM     -> HTTP 404 per questi simboli
//   MOCK_SHORT=SYM:YYYY   -> storia che parte dal 1° gennaio di quell'anno
//   MOCK_OLD=SYM:N        -> toglie le ultime N barre
//   MOCK_DELAY=SYM:ms,... -> ritardo della risposta (cambia l'ordine di arrivo)
//   MOCK_CACHE=dir        -> cartella delle risposte salvate
import fs from 'node:fs';
const dir = process.env.MOCK_CACHE;
const kv = (s) => Object.fromEntries((s || '').split(',').filter(Boolean).map((x) => { const i = x.lastIndexOf(':'); return [x.slice(0, i), x.slice(i + 1)]; }));
const fail = new Set((process.env.MOCK_FAIL || '').split(',').filter(Boolean));
const short = kv(process.env.MOCK_SHORT), old = kv(process.env.MOCK_OLD), delay = kv(process.env.MOCK_DELAY);
globalThis.fetch = async (url) => {
  const sym = decodeURIComponent(new URL(url).pathname.split('/').pop());
  if (delay[sym]) await new Promise((r) => setTimeout(r, +delay[sym]));
  if (fail.has(sym)) return { ok: false, status: 404, json: async () => ({}) };
  const j = JSON.parse(fs.readFileSync(`${dir}/Y_${sym.replace('^', '_').replace('=', '_')}.json`, 'utf-8'));
  const r = j.chart.result[0], q = r.indicators.quote[0], a = r.indicators.adjclose && r.indicators.adjclose[0];
  let keep = r.timestamp.map((_, i) => i);
  if (short[sym]) { const t0 = Date.UTC(+short[sym], 0, 1) / 1000; keep = keep.filter((i) => r.timestamp[i] >= t0); }
  if (old[sym]) keep = keep.slice(0, keep.length - +old[sym]);
  const pick = (arr) => arr && keep.map((i) => arr[i]);
  r.timestamp = pick(r.timestamp);
  for (const k of Object.keys(q)) q[k] = pick(q[k]);
  if (a) a.adjclose = pick(a.adjclose);
  return { ok: true, status: 200, json: async () => j };
};

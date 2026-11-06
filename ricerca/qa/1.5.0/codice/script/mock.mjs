// Finta rete per fetch_vix.js: MOCK=modo1,modo2. Risposte reali salvate in rawcache (prima corsa con REC=1).
import fs from 'node:fs';
const DIR = (process.env.RAWCACHE || '.') + '/'; // risposte reali salvate (REC=1)
const M = new Set((process.env.MOCK || '').split(',').filter(Boolean));
const SCALE = +(process.env.SCALE || 1); // accorcia timeout e attese (per i casi «appeso»)
if (SCALE !== 1) {
  const oT = AbortSignal.timeout.bind(AbortSignal); AbortSignal.timeout = (ms) => oT(ms / SCALE);
  const oS = globalThis.setTimeout; globalThis.setTimeout = (f, ms, ...a) => oS(f, (ms || 0) / SCALE, ...a);
}
const real = globalThis.fetch;
globalThis.__calls = [];
const key = (u) => { const x = new URL(u); return (x.hostname.includes('fred') ? 'fred_' + x.searchParams.get('id') : 'y_' + decodeURIComponent(x.pathname.split('/').pop()) + (x.searchParams.get('period1') < 1e9 ? '_full' : '_tail')).replace(/[^A-Za-z0-9_]/g, '_'); };
const hang = (opt) => new Promise((_, rej) => { const k = setInterval(() => {}, 1000); const s = opt && opt.signal; if (s) s.addEventListener('abort', () => { clearInterval(k); rej(s.reason); }); }); // il socket appeso tiene vivo il processo
globalThis.fetch = async (u, opt) => {
  const url = String(u), k = key(url), fred = url.includes('fred'), sym = k.replace(/^y_/, '').replace(/_(full|tail)$/, '');
  process.stderr.write(`[mock] ${k}\n`);
  if (fred && M.has('fredHang')) return hang(opt);
  if (fred && M.has('fred503')) return new Response('x', { status: 503 });
  if (!fred && M.has('yahooHang')) return hang(opt);
  if (!fred && M.has('yahooNet')) throw new TypeError('fetch failed');
  if (!fred && M.has('vixFail') && sym === '_VIX') throw new TypeError('fetch failed');
  if (!fred && M.has('ndxFail') && sym === '_NDX') throw new TypeError('fetch failed');
  if (!fred && M.has('spxFail') && sym === '_GSPC') throw new TypeError('fetch failed');
  let body;
  if (process.env.REC) { const r = await real(u, opt); body = await r.text(); fs.writeFileSync(DIR + k, body); }
  else body = fs.readFileSync(DIR + k, 'utf8');
  if (fred && M.has('fredOld')) { const l = body.trim().split('\n'); body = l.slice(0, -3).join('\n') + '\n'; } // FRED 3 righe indietro
  if (fred && M.has('fredDot')) { const l = body.trim().split('\n'); l[l.length - 1] = l.at(-1).split(',')[0] + ','; body = l.join('\n') + '\n'; } // ultimo valore vuoto
  if (!fred && M.has('vixEmpty') && sym === '_VIX') { const j = JSON.parse(body); const r = j.chart.result[0]; r.timestamp = []; r.indicators.quote[0].close = []; if (r.indicators.adjclose) r.indicators.adjclose[0].adjclose = []; body = JSON.stringify(j); }
  if (!fred && M.has('vixOld') && sym === '_VIX') { const j = JSON.parse(body); const r = j.chart.result[0]; const n = r.timestamp.length - 5; r.timestamp = r.timestamp.slice(0, n); r.indicators.quote[0].close = r.indicators.quote[0].close.slice(0, n); if (r.indicators.adjclose) r.indicators.adjclose[0].adjclose = r.indicators.adjclose[0].adjclose.slice(0, n); body = JSON.stringify(j); }
  if (!fred && M.has('vixNullLast') && sym === '_VIX') { const j = JSON.parse(body); const r = j.chart.result[0]; r.indicators.quote[0].close[r.timestamp.length - 1] = null; body = JSON.stringify(j); }
  if (!fred && M.has('spxShort') && sym === '_GSPC') { const j = JSON.parse(body); const r = j.chart.result[0]; const c = 3000; r.timestamp = r.timestamp.slice(c); for (const q of ['close','open','high','low','volume']) if (r.indicators.quote[0][q]) r.indicators.quote[0][q] = r.indicators.quote[0][q].slice(c); if (r.indicators.adjclose) r.indicators.adjclose[0].adjclose = r.indicators.adjclose[0].adjclose.slice(c); body = JSON.stringify(j); }
  return new Response(body, { status: 200 });
};

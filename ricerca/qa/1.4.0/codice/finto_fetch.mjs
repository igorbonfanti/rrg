// Precaricato con --import: simula guasti di Yahoo e FRED per scripts/fetch_emerging.js.
// FAIL=regex  → la richiesta fallisce come errore di rete; OLD=regex → la serie arriva senza le ultime 2 barre;
// SHORT=regex → arrivano solo le ultime 300 barre; GAP=regex → manca un tratto di 50 giorni nel 2024.
const real = globalThis.fetch;
const re = (k) => (process.env[k] ? new RegExp(process.env[k]) : null);
const FAIL = re('FAIL'), OLD = re('OLD'), SHORT = re('SHORT'), GAP = re('GAP');
globalThis.fetch = async (url, opt) => {
  const u = decodeURIComponent(String(url));
  if (FAIL && FAIL.test(u)) throw new TypeError('fetch failed (simulato)');
  const r = await real(url, opt);
  if (!/finance\/chart/.test(u) || !(OLD && OLD.test(u) || SHORT && SHORT.test(u) || GAP && GAP.test(u))) return r;
  const j = await r.json(), res = j.chart.result[0];
  let keep = res.timestamp.map((_, i) => i);
  if (OLD && OLD.test(u)) keep = keep.slice(0, -2);
  if (SHORT && SHORT.test(u)) keep = keep.slice(-300);
  if (GAP && GAP.test(u)) { const a = Date.parse('2024-03-01') / 1000, b = Date.parse('2024-04-20') / 1000; keep = keep.filter((i) => res.timestamp[i] < a || res.timestamp[i] > b); }
  const pick = (arr) => (arr ? keep.map((i) => arr[i]) : arr);
  res.timestamp = pick(res.timestamp);
  for (const q of res.indicators.quote) for (const k of Object.keys(q)) q[k] = pick(q[k]);
  if (res.indicators.adjclose) for (const q of res.indicators.adjclose) q.adjclose = pick(q.adjclose);
  return new Response(JSON.stringify(j), { status: 200, headers: { 'content-type': 'application/json' } });
};

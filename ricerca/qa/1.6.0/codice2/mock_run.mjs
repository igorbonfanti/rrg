// (Copia del controllo 1 in ricerca/qa/1.6.0/codice/, con scenari nuovi per il secondo giro: in fondo a S.)
// Esegue scripts/fetch_vix.js di una copia di lavoro con fetch simulato (risposte vere registrate, poi modificate per
// scenario). Il tempo di attesa (pause tra i tentativi e timeout da 30 s) è contato su un orologio virtuale, non atteso.
// Uso: WT=<copia> CACHE=<cartella> MODE=record node mock_run.mjs        (registra le risposte vere)
//      WT=<copia> CACHE=<cartella> SCEN=<nome> node mock_run.mjs        (esegue lo scenario sul data/vix.json di WT)
import fs from 'node:fs';
import path from 'node:path';
const { WT, CACHE, MODE, SCEN = 'ok' } = process.env;
const realFetch = globalThis.fetch;
const keyOf = (u) => {
  const url = new URL(u);
  if (url.host.includes('stlouisfed')) return `fred_${url.searchParams.get('id')}`;
  if (url.host.includes('cboe')) return `cboe_${path.basename(url.pathname).replace('_History.csv', '')}`;
  return `yahoo_${decodeURIComponent(url.pathname.split('/').pop()).replace('^', '')}`;
};
const file = (k) => path.join(CACHE, k + (k.startsWith('yahoo') ? '.json' : '.csv'));
if (MODE === 'record') {
  fs.mkdirSync(CACHE, { recursive: true });
  const p1 = Math.floor(Date.parse('1990-01-01') / 1000), now = Math.floor(Date.now() / 1000), tail = now - 60 * 86400, p07 = Math.floor(Date.parse('2007-01-01') / 1000);
  const ys = [['^GSPC', p1], ['^NDX', p1], ['^VIX', tail], ['^VIX3M', tail], ['HYG', p07], ['IEF', p07]];
  const urls = [...ys.map(([s, a]) => `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=${a}&period2=${now}&interval=1d&includeAdjustedClose=true`),
    'https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS&cosd=1990-01-01', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=VXVCLS&cosd=2007-01-01',
    'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv', 'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX3M_History.csv'];
  for (const u of urls) { const r = await realFetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor data fetch)' } }); fs.writeFileSync(file(keyOf(u)), await r.text()); console.log(r.status, keyOf(u)); }
  process.exit(0);
}
// ---------- orologio virtuale ----------
let vclock = 0; const calls = [];
const realST = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms = 0, ...a) => { vclock += ms; return realST(fn, 0, ...a); };
const hang = () => { vclock += 30000; const e = new DOMException('The operation was aborted due to timeout', 'TimeoutError'); throw e; };
const netErr = () => { throw new TypeError('fetch failed'); };
const resp = (body, status = 200) => new Response(body, { status });
// ---------- scenari ----------
const cboeEdit = (txt, f) => { const l = txt.trim().split(/\r?\n/); return f(l).join('\n') + '\n'; };
const S = {
  ok: {},
  fredDown: { fred: () => resp('Service Unavailable', 503) },
  fredHang: { fred: hang },
  cboeDown: { cboe: () => resp('Forbidden', 403) },
  cboeHang: { cboe: hang },
  yahooDown: { yahoo: netErr },
  yahooHang: { yahoo: hang },
  allDown: { fred: () => resp('x', 503), cboe: () => resp('x', 503), yahoo: netErr },
  allHang: { fred: hang, cboe: hang, yahoo: hang },
  fredCboeDown: { fred: () => resp('x', 503), cboe: () => resp('x', 503) },
  cboeYahooDown: { cboe: () => resp('x', 503), yahoo: netErr },
  cboeLate: { cboeTxt: (t) => cboeEdit(t, (l) => l.slice(0, -1)) }, // Cboe senza l'ultima seduta dell'S&P 500
  cboeLateYahooDown: { cboeTxt: (t) => cboeEdit(t, (l) => l.slice(0, -1)), yahoo: netErr },
  cboeExtra: { cboeTxt: (t) => cboeEdit(t, (l) => [...l, '11/09/2026,30,30,30,31.230000']) }, // una data in più dell'S&P 500
  cboeHtml: { cboeTxt: () => '<html><head><title>Just a moment...</title></head><body>challenge</body></html>' },
  cboeDisclaimer: { cboeTxt: (t) => 'Cboe data is compiled for the convenience of site visitors\n' + t },
  cboeIso: { cboeTxt: (t) => cboeEdit(t, (l) => [l[0], ...l.slice(1).map((x) => x.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2'))]) },
  cboeZero: { cboeTxt: (t) => cboeEdit(t, (l) => [...l.slice(0, -1), l.at(-1).replace(/,[^,]*$/, ',0.000000')]) },
  cboeNeg: { cboeTxt: (t) => cboeEdit(t, (l) => [...l.slice(0, -1), l.at(-1).replace(/,[^,]*$/, ',-1')]) },
  cboeDup: { cboeTxt: (t) => cboeEdit(t, (l) => [...l, l.at(-1).replace(/,[^,]*$/, ',99.990000')]) }, // ultima data ripetuta
  cboeShort: { cboeTxt: (t) => cboeEdit(t, (l) => [l[0], ...l.slice(-5)]) }, // file troncato a 5 righe
  cboeCols: { cboeTxt: (t) => cboeEdit(t, (l) => l.map((x) => x.split(',').slice(0, 1).concat(x.split(',').slice(4), x.split(',').slice(1, 4)).join(','))) }, // CLOSE in 2ª colonna
  cboeOldFred: { cboeTxt: (t) => cboeEdit(t, (l) => l.slice(0, -10)) }, // Cboe fermo prima dell'ultimo FRED
  cboeWild: { cboeTxt: (t) => cboeEdit(t, (l) => [...l.slice(0, -1), l.at(-1).replace(/,[^,]*$/, ',2564.000000')]) }, // valore sbagliato x100
  fredBack: { fredTxt: (t) => t.trim().split('\n').filter((x) => x < '2026-11-01' || x.startsWith('observation') || x.startsWith('DATE')).join('\n') },
  fredBack3m: { fredTxt: (t, id) => (id === 'VXVCLS' ? t.trim().split('\n').filter((x) => x < '2026-11-01' || !/^\d/.test(x)).join('\n') : t) },
  fredNeg: { fredTxt: (t) => t.trim() + '\n' }, // controllo: invariato
  vix3m404: { yahoo404: '^VIX3M', cboeTxt: (t) => cboeEdit(t, (l) => l.slice(0, -1)) }, // Cboe in ritardo e ^VIX3M di Yahoo 404: HYG/IEF?
  hygShort: { yahooJson: (j, sym) => { if (sym === 'HYG') { const r = j.chart.result[0], n = r.timestamp.length, k = n - 3000; r.timestamp = r.timestamp.slice(k); const q = r.indicators.quote[0]; for (const f of Object.keys(q)) q[f] = q[f].slice(k); r.indicators.adjclose[0].adjclose = r.indicators.adjclose[0].adjclose.slice(k); } return j; } },
  // ---- secondo giro (codice2) ----
  cboe503: { cboe: () => resp('x', 503) }, // errore del server: corto circuito, il VIX3M non si chiede
  cboe404VIX3M: { cboeK: (k) => (k === 'cboe_VIX3M' ? resp('Not Found', 404) : null) }, // solo il file del VIX3M sparito
  cboeEmpty: { cboeTxt: () => 'DATE,OPEN,HIGH,LOW,CLOSE\n' }, // file vuoto (solo intestazione)
  cboeNoSess: { cboeTxt: () => 'DATE,OPEN,HIGH,LOW,CLOSE\n11/07/2026,1,1,1,25.00\n' }, // nessuna data è una seduta dell'S&P 500
  cboeLate3m: { cboeTxt: (t, k) => (k === 'cboe_VIX3M' ? cboeEdit(t, (l) => l.slice(0, -1)) : t) }, // in ritardo solo il VIX3M
  cboeLateVix404: { yahoo404: '^VIX', cboeTxt: (t) => cboeEdit(t, (l) => l.slice(0, -1)) }, // Cboe in ritardo e ^VIX 404
  cboeLateYahooNoData: { yahooNoData: '^VIX3M', cboeTxt: (t) => cboeEdit(t, (l) => l.slice(0, -1)) }, // ^VIX3M 200 senza dati
  cboeYahooDownNet: { cboe: netErr, yahoo: netErr }, // Cboe e Yahoo giù, FRED su: coda dal file pubblicato
  cboeDownYahooHang: { cboe: () => resp('x', 503), yahoo: hang },
  cboeHangOnly3m: { cboeK: (k) => (k === 'cboe_VIX3M' ? hang() : null) },
  cboeDupOk: { cboeTxt: (t) => cboeEdit(t, (l) => [...l.slice(0, -1), l.at(-1).replace(/,[^,]*$/, ',25.000000'), l.at(-1)]) }, // ultima data due volte, valori plausibili
  cboeDupMid: { cboeTxt: (t) => cboeEdit(t, (l) => [l[0], l[1], ...l.slice(1)]) }, // prima data ripetuta in testa
  cboeLow: { cboeTxt: (t) => cboeEdit(t, (l) => [...l.slice(0, -1), l.at(-1).replace(/,[^,]*$/, ',0.256400')]) }, // valore /100
  yahooWild: { cboeTxt: (t) => cboeEdit(t, (l) => l.slice(0, -1)), yahooJson: (j, sym) => { if (sym === '^VIX') { const c = j.chart.result[0].indicators.quote[0].close; const ts = j.chart.result[0].timestamp; for (let i = 0; i < ts.length; i++) if (new Date(ts[i] * 1000).toISOString().startsWith('2026-11-06')) c[i] = 256.4; } return j; } },
  hygDiv: { yahooJson: (j, sym) => { if (sym === 'HYG') { const a = j.chart.result[0].indicators.adjclose[0].adjclose; for (let i = 0; i < a.length - 1; i++) if (a[i] != null) a[i] *= 0.9955; } return j; } }, // dividendo: storia riscalata
};
const sc = S[SCEN]; if (!sc) { console.error('scenario sconosciuto', SCEN); process.exit(2); }
globalThis.fetch = async (u, opt) => {
  const k = keyOf(u); calls.push(k);
  if (k.startsWith('fred')) { if (sc.fred) return sc.fred(); let t = fs.readFileSync(file(k), 'utf8'); if (sc.fredTxt) t = sc.fredTxt(t, k.slice(5)); return resp(t); }
  if (k.startsWith('cboe')) { if (sc.cboe) return sc.cboe(); if (sc.cboeK) { const r = sc.cboeK(k); if (r) return r; } let t = fs.readFileSync(file(k), 'utf8'); if (sc.cboeTxt) t = sc.cboeTxt(t, k); return resp(t); }
  if (sc.yahoo) return sc.yahoo();
  const sym = decodeURIComponent(new URL(u).pathname.split('/').pop());
  if (sc.yahoo404 === sym) return resp('{"chart":{"result":null,"error":{"code":"Not Found"}}}', 404);
  if (sc.yahooNoData === sym) return resp('{"chart":{"result":null,"error":null}}', 200);
  let j = JSON.parse(fs.readFileSync(file(k), 'utf8')); if (sc.yahooJson) j = sc.yahooJson(j, sym);
  return resp(JSON.stringify(j));
};
process.on('exit', (code) => { console.log(`@@ scenario=${SCEN} exit=${code} attesa_virtuale_s=${(vclock / 1000).toFixed(1)} richieste=${calls.length} [${calls.join(' ')}]`); });
process.argv[1] = path.join(WT, 'scripts/fetch_vix.js');
await import(path.join(WT, 'scripts/fetch_vix.js'));

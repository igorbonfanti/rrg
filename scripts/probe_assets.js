/*
 * probe_assets.js — verifica TEMPORANEA dei simboli Yahoo candidati per i nuovi universi
 * (portafoglio di lungo periodo e fattori MSCI World). Stampa storia, valuta e qualità dei dati.
 * Da rimuovere dopo la scelta dei ticker.
 */
const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const UA = { 'User-Agent': 'Mozilla/5.0 (sector-monitor asset probe)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400;

async function getJSON(path, tries = 4) {
  let err;
  for (let a = 0; a < tries; a++) {
    try {
      const r = await fetch(`https://${HOSTS[a % 2]}${path}`, { headers: UA });
      if (r.status === 429 || r.status >= 500) throw Object.assign(new Error(`HTTP ${r.status}`), { retry: true });
      if (!r.ok) return { error: `HTTP ${r.status}` };
      return await r.json();
    } catch (e) {
      err = e;
      if (!e.retry && !(e instanceof TypeError)) break;
      await sleep(1000 * 2 ** a);
    }
  }
  return { error: String(err && err.message) };
}

// Borse europee utili (Milano, Xetra, Londra, Amsterdam, Parigi, Svizzera)
function pct(x) { return x == null || !isFinite(x) ? '   n/d' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`.padStart(7); }

// Terza passata: l'ultima barra degli ETF europei manca nella serie giornaliera a 5 anni?
async function main() {
  const syms = ['SWDA.MI', 'EUNL.DE', 'IWDA.AS', 'IWDA.L', 'EIMI.MI', 'X13E.MI', 'SGLD.MI', 'IWDP.MI', 'CMOD.MI', 'ZPRS.DE', 'BTC-EUR', 'URTH'];
  for (const s of syms) {
    for (const range of ['5d', '1mo', '1y', '2y', '5y', '10y']) {
      const j = await getJSON(`/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=1d&includeAdjustedClose=true`);
      const res = j.chart && j.chart.result && j.chart.result[0];
      if (!res || !res.timestamp) { console.log(`${s} ${range}: ${j.error || 'nessun dato'}`); continue; }
      const m = res.meta, ts = res.timestamp, c = res.indicators.quote[0].close;
      const tail = ts.slice(-3).map((t, k) => {
        const i = ts.length - 3 + k;
        return `${new Date((t + (m.gmtoffset || 0)) * 1000).toISOString().slice(0, 16).replace('T', ' ')}=${c[i] == null ? 'null' : c[i].toFixed(3)}`;
      }).join('  ');
      const rmt = new Date((m.regularMarketTime + (m.gmtoffset || 0)) * 1000).toISOString().slice(0, 16).replace('T', ' ');
      console.log(`${s.padEnd(8)} ${range.padEnd(4)} gran=${m.dataGranularity} n=${ts.length} | ${tail} | rmt ${rmt} ${m.regularMarketPrice}`);
      await sleep(150);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

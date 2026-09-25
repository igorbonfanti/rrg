/*
 * probe_assets.js — verifica TEMPORANEA dei simboli Yahoo candidati per i nuovi universi
 * (fattori aggiuntivi, regioni, paesi, ACWI, alternative small cap e bitcoin).
 * Da rimuovere dopo la scelta dei ticker.
 */
const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const UA = { 'User-Agent': 'Mozilla/5.0 (sector-monitor asset probe)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const EU = /\.(MI|DE|AS|PA|MC|L|SW)$/;
const pct = (x) => (x == null || !isFinite(x) ? '   n/d' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`.padStart(7));

// [gruppo, ricerca (ISIN o testo)]
const QUERIES = [
  ['GROWTH', 'MSCI World Growth'], ['GROWTH', 'World Growth UCITS'], ['GROWTH', 'MSCI USA Growth UCITS'], ['GROWTH', 'S&P 500 Growth UCITS'],
  ['DIV', 'MSCI World High Dividend Yield'], ['DIV', 'FTSE All-World High Dividend Yield'], ['DIV', 'MSCI World Quality Dividend'],
  ['DIV', 'Global Select Dividend 100'], ['DIV', 'Global Dividend Aristocrats'],
  ['EQW', 'MSCI World Equal Weight'], ['EQW', 'World Equal Weight UCITS'], ['EQW', 'Equal Weight UCITS'],
  ['ACWI', 'IE00B6R52259'], ['ACWI', 'IE00B44Z5B48'], ['ACWI', 'IE00BK5BQT80'], ['ACWI', 'MSCI ACWI UCITS'],
  ['USA', 'IE00B5BMR087'], ['USA', 'IE00B52SF786'], ['USA', 'IE00BJ0KDR00'],
  ['EUROPA', 'IE00B4K48X80'], ['EUROPA', 'LU0274209237'], ['EUROPA', 'MSCI Europe UCITS'],
  ['GIAPPONE', 'IE00B4L5YX21'], ['GIAPPONE', 'LU0274209740'], ['GIAPPONE', 'MSCI Japan UCITS'],
  ['PACIFICO', 'IE00B52MJY50'], ['PACIFICO', 'LU0322252338'], ['PACIFICO', 'MSCI Pacific ex Japan'],
  ['CANADA', 'IE00B52VJ196'], ['CANADA', 'LU0476289540'], ['CANADA', 'MSCI Canada UCITS'],
  ['UK', 'IE00B539F030'], ['UK', 'MSCI UK UCITS'], ['UK', 'FTSE 100 UCITS'],
  ['SVIZZERA', 'MSCI Switzerland'], ['SVIZZERA', 'SMI UCITS ETF'], ['SVIZZERA', 'Switzerland UCITS ETF'],
  ['GERMANIA', 'DE0005933931'], ['GERMANIA', 'LU0274211480'], ['GERMANIA', 'MSCI Germany UCITS'],
  ['FRANCIA', 'CAC 40 UCITS'], ['FRANCIA', 'MSCI France UCITS'],
  ['ITALIA', 'IE00B53L4X51'], ['ITALIA', 'FTSE MIB UCITS'], ['ITALIA', 'MSCI Italy UCITS'],
  ['SPAGNA', 'IBEX 35 UCITS'], ['SPAGNA', 'MSCI Spain UCITS'],
  ['OLANDA', 'IE00B0M62Y33'], ['OLANDA', 'AEX UCITS'], ['OLANDA', 'MSCI Netherlands'],
  ['CINA', 'LU0514695690'], ['CINA', 'IE00BJ5JPG56'], ['CINA', 'MSCI China UCITS'],
  ['INDIA', 'IE00BZCQB185'], ['INDIA', 'LU1681043086'], ['INDIA', 'MSCI India UCITS'],
  ['TAIWAN', 'LU0292109187'], ['TAIWAN', 'IE00B0M63623'], ['TAIWAN', 'MSCI Taiwan'],
  ['COREA', 'IE00B0M63391'], ['COREA', 'LU0292100046'], ['COREA', 'MSCI Korea'],
  ['BRASILE', 'IE00B0M63516'], ['BRASILE', 'LU0292109344'], ['BRASILE', 'MSCI Brazil'],
  ['BTC', 'DE000A27Z304'], ['BTC', 'DE000A28M8D0'], ['BTC', 'Bitcoin ETP'], ['BTC', 'Physical Bitcoin'],
];

// [gruppo, simbolo] provati direttamente
const DIRECT = [
  ['SMALL', 'ZPRS.DE'], ['SMALL', 'IUSN.DE'], ['SMALL', 'ZPRS.MI'], ['SMALL', 'IUSN.MI'], ['SMALL', 'WOSC.MI'],
  ['ACWI', 'SSAC.MI'], ['ACWI', 'IUSQ.DE'], ['ACWI', 'SPYY.DE'], ['ACWI', 'VWCE.MI'], ['ACWI', 'VWCE.DE'],
  ['USA', 'CSSPX.MI'], ['USA', 'SXR8.DE'], ['USA', 'SXR4.DE'], ['USA', 'XD9U.DE'],
  ['EUROPA', 'SMEA.MI'], ['EUROPA', 'IMAE.AS'], ['EUROPA', 'XMEU.MI'], ['GIAPPONE', 'SJPA.MI'], ['GIAPPONE', 'XMJP.MI'],
  ['PACIFICO', 'CSPXJ.MI'], ['PACIFICO', 'SXR1.DE'], ['PACIFICO', 'XPXJ.MI'],
  ['CANADA', 'CSCA.MI'], ['CANADA', 'SXR2.DE'], ['UK', 'CSUK.MI'], ['UK', 'XUKX.MI'],
  ['GERMANIA', 'EXS1.DE'], ['GERMANIA', 'XDAX.DE'], ['GERMANIA', 'XDAX.MI'],
  ['FRANCIA', 'C40.PA'], ['FRANCIA', 'CAC.PA'], ['ITALIA', 'IMIB.MI'], ['ITALIA', 'XMIB.MI'], ['ITALIA', 'ETFMIB.MI'],
  ['OLANDA', 'IAEX.AS'], ['CINA', 'XCS6.DE'], ['INDIA', 'QDV5.DE'], ['INDIA', 'XCS5.DE'],
  ['BTC', 'BTC-EUR'], ['BTC', 'BTC-USD'], ['BTC', 'BTCE.DE'], ['BTC', 'VBTC.DE'], ['FX', 'EURUSD=X'], ['REF', 'SWDA.MI'],
];

function daily(res) {
  const meta = res.meta || {};
  const ts = res.timestamp || [];
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const adj = (res.indicators.adjclose && res.indicators.adjclose[0] && res.indicators.adjclose[0].adjclose) || [];
  const off = meta.gmtoffset || 0;
  const rows = [];
  let nulls = 0;
  for (let i = 0; i < ts.length; i++) {
    const c = q.close ? q.close[i] : null;
    if (c == null) { nulls++; continue; }
    const d = new Date((ts[i] + off) * 1000).toISOString().slice(0, 10);
    if (rows.length && rows[rows.length - 1].d === d) continue;
    rows.push({ d, c, a: adj[i] ?? c });
  }
  return { meta, rows, nulls };
}

async function main() {
  const found = new Map(); // simbolo → gruppo
  for (const [g, s] of DIRECT) if (!found.has(s)) found.set(s, g);
  for (const [g, q] of QUERIES) {
    const j = await getJSON(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0&listsCount=0`);
    const syms = (j.quotes || []).filter((x) => x.symbol && EU.test(x.symbol));
    console.log(`search ${g.padEnd(9)} ${q.padEnd(36)} → ${syms.map((x) => `${x.symbol}`).join(' ') || (j.error || 'nessun risultato')}`);
    for (const x of syms) if (!found.has(x.symbol)) found.set(x.symbol, g);
    await sleep(250);
  }

  const list = [...found.entries()];
  const out = new Map();
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const [sym, g] = list[next++];
      const m = await getJSON(`/v8/finance/chart/${encodeURIComponent(sym)}?range=max&interval=1mo`);
      const mres = m.chart && m.chart.result && m.chart.result[0];
      const d = await getJSON(`/v8/finance/chart/${encodeURIComponent(sym)}?range=5y&interval=1d&includeAdjustedClose=true`);
      const dres = d.chart && d.chart.result && d.chart.result[0];
      out.set(sym, {
        g,
        first: mres && mres.timestamp ? new Date(mres.timestamp[0] * 1000).toISOString().slice(0, 7) : null,
        name: ((mres || dres || {}).meta || {}).longName || ((mres || dres || {}).meta || {}).shortName || '',
        day: dres && dres.timestamp ? daily(dres) : null,
        err: d.error || m.error || null,
      });
      await sleep(150);
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  const ref = out.get('SWDA.MI').day.rows;
  const refSet = new Set(ref.map((r) => r.d));
  const refRet = new Map(ref.map((r, i) => [r.d, i ? r.c / ref[i - 1].c - 1 : 0]));
  console.log('\nsimbolo      cur exch | dal     | barre null | -/+ vs MIL 1a | spike (data)          | max|r| (data)       | 5a TR   | nome');
  const groups = [...new Set(list.map(([, g]) => g))];
  for (const g of groups) {
    console.log(`\n=== ${g} ===`);
    const rows = list.filter(([, gg]) => gg === g).map(([s]) => [s, out.get(s)]).sort((a, b) => ((a[1].first || '9') < (b[1].first || '9') ? -1 : 1));
    for (const [s, x] of rows) {
      if (!x.day) { console.log(`${s.padEnd(12)} — ${x.err || 'nessun dato'} (dal ${x.first || '?'})`); continue; }
      const R = x.day.rows;
      const y = R.filter((r) => r.d > '2025-09-24');
      const set = new Set(y.map((r) => r.d));
      const miss = [...refSet].filter((d) => d > '2025-09-24' && !set.has(d)).length;
      const extra = y.filter((r) => !refSet.has(r.d)).length;
      // spike: salto e rientro il giorno dopo mentre il riferimento è fermo
      const spikes = [];
      let mx = 0, mxd = '';
      for (let i = 1; i < R.length; i++) {
        const r1 = R[i].c / R[i - 1].c - 1;
        if (Math.abs(r1) > mx) { mx = Math.abs(r1); mxd = R[i].d; }
        if (i + 1 < R.length) {
          const r2 = R[i + 1].c / R[i].c - 1;
          if (Math.abs(r1) > 0.06 && Math.abs(r2) > 0.04 && r1 * r2 < 0 && Math.abs((1 + r1) * (1 + r2) - 1) < 0.03 && Math.abs(refRet.get(R[i].d) || 0) < 0.03) spikes.push(`${R[i].d} ${pct(r1).trim()}`);
        }
      }
      const f = R[0], L = R[R.length - 1];
      const meta = x.day.meta;
      console.log(`${s.padEnd(12)} ${(meta.currency || '').padEnd(3)} ${(meta.exchangeName || '').padEnd(4)} | ${x.first} | ${String(R.length).padStart(5)} ${String(x.day.nulls).padStart(4)} | ${String(miss).padStart(3)}/${String(extra).padEnd(9)} | ${(spikes.join(', ') || '—').padEnd(21)} | ${(mx * 100).toFixed(1).padStart(5)}% (${mxd}) | ${pct(L.a / f.a - 1)} | ${x.name.slice(0, 60)}`);
    }
  }

  // Confronti diretti
  const pair = (a, b) => {
    const A = out.get(a), B = out.get(b);
    if (!A || !B || !A.day || !B.day) return console.log(`${a} vs ${b}: dati mancanti`);
    const mb = new Map(B.day.rows.map((r) => [r.d, r.a]));
    const common = A.day.rows.filter((r) => mb.has(r.d));
    // rendimenti settimanali (ultimo giorno comune di ogni settimana ISO)
    const wk = new Map();
    for (const r of common) {
      const dt = new Date(r.d + 'T12:00:00Z');
      const monday = new Date(dt - ((dt.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
      wk.set(monday, [r.a, mb.get(r.d)]);
    }
    const w = [...wk.values()];
    const ra = [], rb = [];
    for (let i = 1; i < w.length; i++) { ra.push(Math.log(w[i][0] / w[i - 1][0])); rb.push(Math.log(w[i][1] / w[i - 1][1])); }
    const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
    const ma = mean(ra), mbb = mean(rb);
    let cov = 0, va = 0, vb = 0, te = 0;
    for (let i = 0; i < ra.length; i++) { cov += (ra[i] - ma) * (rb[i] - mbb); va += (ra[i] - ma) ** 2; vb += (rb[i] - mbb) ** 2; te += (ra[i] - rb[i]) ** 2; }
    const yrs = (new Date(common.at(-1).d) - new Date(common[0].d)) / (365.25 * 86400000);
    const ta = common.at(-1).a / common[0].a, tb = mb.get(common.at(-1).d) / mb.get(common[0].d);
    console.log(`${a} vs ${b}: ${common[0].d} → ${common.at(-1).d}, corr settimanale ${(cov / Math.sqrt(va * vb)).toFixed(4)}, tracking error ${(Math.sqrt(te / ra.length) * Math.sqrt(52) * 100).toFixed(2)}%/anno, rendimento ${pct(ta - 1)} vs ${pct(tb - 1)} (differenza ${((ta ** (1 / yrs) - tb ** (1 / yrs)) * 100).toFixed(2)}%/anno)`);
  };
  console.log('\n=== CONFRONTI ===');
  pair('ZPRS.DE', 'IUSN.DE');
  pair('BTC-EUR', 'BTC-USD');
  pair('BTCE.DE', 'BTC-EUR');
  pair('VBTC.DE', 'BTC-EUR');
  pair('SSAC.MI', 'SWDA.MI');
  pair('CSSPX.MI', 'SXR4.DE');
}

main().catch((e) => { console.error(e); process.exit(1); });

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

// Ultima passata: quotazioni gemelle (stesso ETF su borse diverse) per scegliere la più pulita
const PAIRS = [
  ['SWDA.MI', 'EUNL.DE'], ['EIMI.MI', 'IS3N.DE'], ['SMEA.MI', 'EUNK.DE'], ['CSPXJ.MI', 'SXR1.DE'], ['CSCA.MI', 'SXR2.DE'], ['CSSPX.MI', 'SXR8.DE'],
  ['IWVL.MI', 'IS3S.DE'], ['IWQU.MI', 'IS3Q.DE'], ['IWMO.MI', 'IS3R.DE'], ['MVOL.MI', 'IQQ0.DE'], ['XSMI.MI', 'XSMI.DE'], ['XDAX.MI', 'DBXD.DE'],
  ['IBZL.MI', 'IBZL.AS'], ['EM710.MI', 'MTD.PA'], ['EQQQ.MI', 'EQQQ.DE'], ['MWEQ.MI', 'MWEQ.DE'], ['VHYL.MI', 'VHYL.AS'], ['IQQT.DE', 'ITWN.AS'],
  ['IQQK.DE', 'IKRA.AS'], ['LYXIB.MC', 'AMES.DE'], ['LYXIB.MC', 'CS1.PA'], ['AMES.DE', 'CS1.PA'], ['CACC.PA', 'CAC.PA'], ['CACC.PA', 'DX2G.DE'],
  ['SJPA.MI', 'XMJP.MI'], ['EXS1.DE', 'DBXD.DE'], ['XMIB.MI', 'ETFMIB.MI'], ['ISF.MI', 'ISF.SW'], ['SGLD.MI', '4GLD.DE'], ['IWDP.MI', 'IQQ6.DE'],
  ['CMOD.MI', 'WCOA.MI'], ['EM13.MI', 'X13E.MI'], ['EM15.MI', 'DBXF.DE'], ['XCS6.DE', 'ICGA.DE'], ['QDV5.DE', 'XCS5.DE'], ['IUSQ.DE', 'SPYY.DE'],
  ['VGWE.DE', 'VHYL.AS'], ['ZPRS.DE', 'IUSN.DE'], ['IAEX.AS', 'TDT.AS'], ['XEON.MI', 'XEON.DE'],
];

async function load(s) {
  const d = await getJSON(`/v8/finance/chart/${encodeURIComponent(s)}?range=2y&interval=1d&includeAdjustedClose=true`);
  const res = d.chart && d.chart.result && d.chart.result[0];
  if (!res || !res.timestamp) return null;
  const off = (res.meta && res.meta.gmtoffset) || 0, q = res.indicators.quote[0];
  const adj = (res.indicators.adjclose && res.indicators.adjclose[0].adjclose) || q.close;
  const m = new Map();
  res.timestamp.forEach((t, i) => { if (q.close[i] != null) m.set(new Date((t + off) * 1000).toISOString().slice(0, 10), adj[i] ?? q.close[i]); });
  return m;
}

async function main() {
  const syms = [...new Set(PAIRS.flat().concat(['SWDA.MI']))];
  const data = new Map();
  let next = 0;
  async function worker() { while (next < syms.length) { const s = syms[next++]; data.set(s, await load(s)); await sleep(150); } }
  await Promise.all([worker(), worker(), worker()]);
  const ref = data.get('SWDA.MI');
  const rets = (m, dates) => { const r = []; for (let i = 1; i < dates.length; i++) r.push(Math.log(m.get(dates[i]) / m.get(dates[i - 1]))); return r; };
  const corr = (a, b) => {
    const n = a.length, ma = a.reduce((t, x) => t + x, 0) / n, mb = b.reduce((t, x) => t + x, 0) / n;
    let c = 0, va = 0, vb = 0;
    for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
    return c / Math.sqrt(va * vb);
  };
  const quality = (s) => {
    const m = data.get(s);
    if (!m) return `${s} n/d`;
    const dates = [...m.keys()].filter((d) => ref.has(d));
    const r = rets(m, dates), rr = rets(ref, dates);
    const flat = r.filter((x) => x === 0).length;
    return `${s.padEnd(9)} corrW ${corr(r, rr).toFixed(3)} flat ${String(flat).padStart(3)}`;
  };
  console.log('coppia                 | corr gemelli | giorni scarto >1,5% (primi)                        | qualità A                       | qualità B');
  for (const [a, b] of PAIRS) {
    const A = data.get(a), B = data.get(b);
    if (!A || !B) { console.log(`${a} / ${b}: dati mancanti`); continue; }
    const dates = [...A.keys()].filter((d) => B.has(d));
    const ra = rets(A, dates), rb = rets(B, dates);
    const big = [];
    for (let i = 0; i < ra.length; i++) if (Math.abs(ra[i] - rb[i]) > 0.015) big.push(`${dates[i + 1].slice(2)} ${(100 * (ra[i] - rb[i])).toFixed(1)}`);
    console.log(`${(a + ' / ' + b).padEnd(22)} | ${corr(ra, rb).toFixed(4).padStart(12)} | ${String(big.length).padStart(3)} ${big.slice(0, 4).join(', ').padEnd(46)} | ${quality(a)} | ${quality(b)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

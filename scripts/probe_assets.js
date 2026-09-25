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

// Ultima passata: Growth, Brasile, Taiwan, quotazioni a Milano e confronti tra quotazioni dello stesso indice
const QUERIES = ['Growth UCITS', 'MSCI World Growth UCITS ETF', 'Growth ETF Acc', 'Nasdaq 100 UCITS', 'MSCI USA Growth', 'S&P 500 Growth',
  'World Quality Growth', 'Brazil UCITS', 'MSCI Brazil UCITS ETF', 'LU1900066207', 'Taiwan UCITS', 'MSCI Taiwan UCITS ETF', 'VHYL', 'VGWE'];
const DIRECT = ['EQQQ.MI', 'CNDX.MI', 'SXRV.DE', 'EQQQ.DE', 'VHYL.MI', 'VGWE.MI', 'VGWD.MI', 'MWEQ.DE', 'MWEQ.MI', 'BRA.PA', 'DBX6.DE',
  'XMBR.DE', '4BRZ.DE', 'IBZL.L', 'DBX5.DE', 'XMTW.DE', 'ITWN.AS', 'CSSPX.MI', 'SXR8.DE', 'SXR4.DE', 'XD9U.DE', 'LYXIB.MC', 'AMES.DE',
  'EURUSD=X', 'SWDA.MI', 'IUSQ.DE', 'SPYY.DE', 'IWSZ.MI'];

function daily(res) {
  const meta = res.meta || {};
  const ts = res.timestamp || [];
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const adj = (res.indicators.adjclose && res.indicators.adjclose[0] && res.indicators.adjclose[0].adjclose) || [];
  const off = meta.gmtoffset || 0;
  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close ? q.close[i] : null;
    if (c == null) continue;
    const d = new Date((ts[i] + off) * 1000).toISOString().slice(0, 10);
    if (rows.length && rows[rows.length - 1].d === d) continue;
    rows.push({ d, c, a: adj[i] ?? c });
  }
  return { meta, rows };
}

async function main() {
  const found = new Set(DIRECT);
  for (const q of QUERIES) {
    const j = await getJSON(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=25&newsCount=0&listsCount=0`);
    const quotes = (j.quotes || []).filter((x) => x.symbol && x.quoteType === 'ETF');
    console.log(`\nsearch "${q}":`);
    for (const x of quotes) console.log(`   ${x.symbol.padEnd(12)} ${String(x.exchange).padEnd(4)} ${(x.longname || x.shortname || '').slice(0, 80)}`);
    for (const x of quotes) if (EU.test(x.symbol)) found.add(x.symbol);
    await sleep(250);
  }
  const data = new Map();
  const list = [...found];
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const s = list[next++];
      const m = await getJSON(`/v8/finance/chart/${encodeURIComponent(s)}?range=max&interval=1mo`);
      const mres = m.chart && m.chart.result && m.chart.result[0];
      const d = await getJSON(`/v8/finance/chart/${encodeURIComponent(s)}?range=5y&interval=1d&includeAdjustedClose=true`);
      const dres = d.chart && d.chart.result && d.chart.result[0];
      data.set(s, { first: mres && mres.timestamp ? new Date(mres.timestamp[0] * 1000).toISOString().slice(0, 7) : null, day: dres && dres.timestamp ? daily(dres) : null, err: d.error || m.error });
      await sleep(150);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  console.log('\nsimbolo      cur  exch | dal     | barre | ultimo      | 5a TR   | nome');
  for (const s of list.sort()) {
    const x = data.get(s);
    if (!x.day) { console.log(`${s.padEnd(12)} — ${x.err || 'nessun dato'}`); continue; }
    const R = x.day.rows, m = x.day.meta, f = R[0], L = R[R.length - 1];
    console.log(`${s.padEnd(12)} ${(m.currency || '').padEnd(4)} ${(m.exchangeName || '').padEnd(4)} | ${x.first} | ${String(R.length).padStart(5)} | ${L.d} ${String(L.c.toFixed(2)).padStart(9)} | ${pct(L.a / f.a - 1)} | ${(m.longName || m.shortName || '').slice(0, 70)}`);
  }
  const pair = (a, b) => {
    const A = data.get(a), B = data.get(b);
    if (!A || !B || !A.day || !B.day) return console.log(`${a} vs ${b}: dati mancanti`);
    const mb = new Map(B.day.rows.map((r) => [r.d, r.a]));
    const common = A.day.rows.filter((r) => mb.has(r.d));
    const ra = [], rb = [];
    for (let i = 1; i < common.length; i++) { ra.push(Math.log(common[i].a / common[i - 1].a)); rb.push(Math.log(mb.get(common[i].d) / mb.get(common[i - 1].d))); }
    const mean = (v) => v.reduce((t, x) => t + x, 0) / v.length;
    const ma = mean(ra), mbb = mean(rb);
    let cov = 0, va = 0, vb = 0, big = [];
    for (let i = 0; i < ra.length; i++) {
      cov += (ra[i] - ma) * (rb[i] - mbb); va += (ra[i] - ma) ** 2; vb += (rb[i] - mbb) ** 2;
      if (Math.abs(ra[i] - rb[i]) > 0.02) big.push(`${common[i + 1].d} ${(100 * (ra[i] - rb[i])).toFixed(1)}`);
    }
    const ta = common.at(-1).a / common[0].a, tb = mb.get(common.at(-1).d) / mb.get(common[0].d);
    console.log(`${a} vs ${b}: dal ${common[0].d}, corr giornaliera ${(cov / Math.sqrt(va * vb)).toFixed(4)}, rendimento ${pct(ta - 1)} vs ${pct(tb - 1)}, giorni con scarto >2%: ${big.length} ${big.slice(0, 8).join(', ')}`);
  };
  console.log('\n=== CONFRONTI (giornalieri) ===');
  pair('CSSPX.MI', 'SXR8.DE'); pair('CSSPX.MI', 'SXR4.DE'); pair('SXR4.DE', 'XD9U.DE'); pair('CSSPX.MI', 'XD9U.DE');
  pair('LYXIB.MC', 'AMES.DE'); pair('MWEQ.DE', 'MWEQ.MI'); pair('VHYL.MI', 'VGWE.DE'); pair('IUSQ.DE', 'SPYY.DE'); pair('ITWN.AS', 'XMTW.DE');
  // 4BRZ.DE dichiarato in USD: confronto dei livelli con EURUSD
  const b = data.get('4BRZ.DE'), fx = data.get('EURUSD=X');
  if (b && b.day && fx && fx.day) console.log(`4BRZ.DE ultimo ${b.day.rows.at(-1).c} (${b.day.meta.currency}); EURUSD ${fx.day.rows.at(-1).c}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

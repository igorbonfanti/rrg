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
const EU = /\.(MI|DE|L|AS|PA|SW)$/;

// [gruppo, ISIN o testo da cercare]
const QUERIES = [
  ['DEV', 'IE00B4L5Y983'], ['DEV', 'IE00BJ0KDQ92'], ['DEV', 'IE00BFY0GT14'], ['DEV', 'IE00BK5BQV03'],
  ['EM', 'IE00BKM4GZ66'], ['EM', 'IE00B4L5YC18'], ['EM', 'IE00B0M63177'], ['EM', 'IE00BTJRMP35'], ['EM', 'IE00B3VVMM84'],
  ['EURGOV', 'IE00B14X4Q57'], ['EURGOV', 'LU0290356871'], ['EURGOV', 'LU1650487413'], ['EURGOV', 'IE00B3VTML14'],
  ['EURGOV', 'IE00B1FZS806'], ['EURGOV', 'IE00B4WXJJ64'], ['EURGOV', 'LU0290356954'], ['EURGOV', 'IE00B1FZS913'],
  ['EURGOV', 'LU0290357507'], ['EURGOV', 'LU0290355717'],
  ['EURGOV', 'Xtrackers II Eurozone Government Bond'], ['EURGOV', 'iShares Euro Government Bond'],
  ['EURGOV', 'Amundi Euro Government Bond'], ['EURGOV', 'iShares EUR Govt Bond'],
  ['USGOV', 'IE00B14X4S71'], ['USGOV', 'IE00B3VWN393'], ['USGOV', 'IE00B1FZS798'], ['USGOV', 'IE00BSKRJZ44'],
  ['GOLD', 'JE00B1VS3770'], ['GOLD', 'IE00B579F325'], ['GOLD', 'DE000A0S9GB0'], ['GOLD', 'IE00B4ND3602'],
  ['REIT', 'IE00B1FZS350'], ['REIT', 'IE00B8GF1M35'], ['REIT', 'IE00B5L01S80'], ['REIT', 'LU1832418773'],
  ['REIT', 'Developed Markets Property Yield'], ['REIT', 'EPRA Nareit Developed UCITS'],
  ['COMM', 'IE00BDFL4P12'], ['COMM', 'IE00BD6FTQ80'], ['COMM', 'LU1829218749'], ['COMM', 'IE00BYMLZY74'],
  ['COMM', 'IE00B53H0131'], ['COMM', 'Bloomberg Commodity UCITS'],
  ['BTC', 'GB00BLD4ZL17'], ['BTC', 'CH0454664001'], ['BTC', 'GB00BJYDH287'], ['BTC', 'XS2940466316'],
  ['CASH', 'LU0290358497'], ['CASH', 'LU1190417599'], ['6040', 'IE00BMVB5R75'],
  ['FACT', 'IE00BP3QZB59'], ['FACT', 'IE00BP3QZ601'], ['FACT', 'IE00BP3QZ825'], ['FACT', 'IE00B8FHGS14'],
  ['FACT', 'IE00BP3QZD73'], ['FACT', 'IE00BF4RFH31'], ['FACT', 'IE00BCBJG560'], ['FACT', 'IE00BL25JM42'],
  ['FACT', 'IE00BL25JL35'], ['FACT', 'IE00BL25JN58'], ['FACT', 'IE00BL25JP72'], ['FACT', 'IE00BZ0PKT83'],
  ['FACT', 'MSCI World Small Cap UCITS'], ['FACT', 'MSCI World Value Factor'], ['FACT', 'MSCI World Minimum Volatility'],
];

// [gruppo, simbolo] provati direttamente
const DIRECT = [
  ['US', 'URTH'], ['US', 'ACWI'], ['US', 'VT'], ['US', 'EFA'], ['US', 'EEM'], ['US', 'IEMG'], ['US', 'VWO'],
  ['US', 'SHY'], ['US', 'IEI'], ['US', 'IEF'], ['US', 'TLT'], ['US', 'GOVT'], ['US', 'GLD'], ['US', 'IAU'],
  ['US', 'VNQ'], ['US', 'REET'], ['US', 'RWO'], ['US', 'DBC'], ['US', 'GSG'], ['US', 'PDBC'], ['US', 'BCI'],
  ['US', 'AOR'], ['US', 'BIL'], ['US', 'VLUE'], ['US', 'QUAL'], ['US', 'MTUM'], ['US', 'USMV'], ['US', 'SIZE'],
  ['US', 'IWM'], ['US', 'IJR'], ['US', 'ACWV'], ['US', 'IQLT'], ['US', 'IMTM'], ['US', 'IVLU'], ['US', 'IBIT'],
  ['BTC', 'BTC-USD'], ['BTC', 'BTC-EUR'], ['FX', 'EURUSD=X'],
  ['DEV', 'SWDA.MI'], ['DEV', 'EUNL.DE'], ['DEV', 'IWDA.AS'], ['DEV', 'IWDA.L'], ['DEV', 'XDWD.DE'], ['DEV', 'XDWD.MI'],
  ['EM', 'EIMI.MI'], ['EM', 'IS3N.DE'], ['EM', 'EMIM.L'], ['EM', 'IEMA.MI'], ['EM', 'IEEM.MI'], ['EM', 'XMME.DE'],
  ['EURGOV', 'IBGS.MI'], ['EURGOV', 'IBGS.AS'], ['EURGOV', 'IBGM.MI'], ['EURGOV', 'IBGL.MI'], ['EURGOV', 'IBGX.MI'],
  ['EURGOV', 'SXRP.DE'], ['EURGOV', 'CSBGE7.MI'], ['EURGOV', 'DBXP.DE'], ['EURGOV', 'X13E.MI'], ['EURGOV', 'EM13.MI'],
  ['EURGOV', 'EM35.MI'], ['EURGOV', 'EM57.MI'], ['EURGOV', 'EM710.MI'], ['EURGOV', 'EM1015.MI'], ['EURGOV', 'EM15.MI'],
  ['EURGOV', 'X25E.MI'], ['EURGOV', 'DBZB.DE'], ['EURGOV', 'IEGA.MI'],
  ['GOLD', 'SGLD.MI'], ['GOLD', 'PHAU.MI'], ['GOLD', '4GLD.DE'], ['GOLD', 'SGLN.L'],
  ['REIT', 'IWDP.MI'], ['REIT', 'IWDP.L'], ['COMM', 'CMOD.MI'], ['COMM', 'CRB.MI'], ['COMM', 'ICOM.L'], ['COMM', 'WCOA.MI'],
  ['FACT', 'IWVL.MI'], ['FACT', 'IS3S.DE'], ['FACT', 'IWVL.L'], ['FACT', 'IWQU.MI'], ['FACT', 'IS3Q.DE'], ['FACT', 'IWQU.L'],
  ['FACT', 'IWMO.MI'], ['FACT', 'IS3R.DE'], ['FACT', 'IWMO.L'], ['FACT', 'MVOL.MI'], ['FACT', 'IQQ0.DE'], ['FACT', 'MVOL.L'],
  ['FACT', 'IWSZ.MI'], ['FACT', 'WSML.MI'], ['FACT', 'IUSN.DE'], ['FACT', 'WSML.L'], ['FACT', 'ZPRS.DE'],
  ['FACT', 'XDEV.MI'], ['FACT', 'XDEV.DE'], ['FACT', 'XDEQ.MI'], ['FACT', 'XDEQ.DE'], ['FACT', 'XDEM.MI'], ['FACT', 'XDEM.DE'],
  ['FACT', 'XDEB.MI'], ['FACT', 'XDEB.DE'],
  ['CASH', 'XEON.DE'], ['CASH', 'XEON.MI'], ['USGOV', 'IBTS.MI'], ['USGOV', 'IBTM.MI'], ['USGOV', 'IDTL.L'], ['USGOV', 'CSBGU7.MI'],
  ['BTC', 'BITC.SW'], ['BTC', 'ABTC.SW'], ['BTC', 'IB1T.DE'],
];

function pct(x) { return x == null || !isFinite(x) ? '   n/d' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`.padStart(7); }

function describe(res) {
  const meta = res.meta || {};
  const ts = res.timestamp || [];
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const adj = (res.indicators.adjclose && res.indicators.adjclose[0] && res.indicators.adjclose[0].adjclose) || [];
  const off = meta.gmtoffset || 0;
  const rows = [];
  const lastT = ts[ts.length - 1];
  let nulls1y = 0;
  for (let i = 0; i < ts.length; i++) {
    const c = q.close ? q.close[i] : null;
    if (c == null) { if (lastT - ts[i] < 365 * DAY) nulls1y++; continue; }
    rows.push({ d: new Date((ts[i] + off) * 1000).toISOString().slice(0, 10), t: ts[i], c, a: adj[i] ?? c, v: q.volume ? q.volume[i] : null });
  }
  if (!rows.length) return null;
  const L = rows[rows.length - 1];
  const y1 = rows.filter((r) => r.t > L.t - 365 * DAY);
  const y2 = rows.filter((r) => r.t > L.t - 730 * DAY);
  const y3 = rows.filter((r) => r.t > L.t - 1095 * DAY);
  let flat = 0; for (let i = 1; i < y2.length; i++) if (y2[i].c === y2[i - 1].c) flat++;
  const zeroVol = y1.filter((r) => r.v === 0).length;
  let gap = 0; for (let i = 1; i < y3.length; i++) gap = Math.max(gap, Math.round((y3[i].t - y3[i - 1].t) / DAY));
  const i5 = rows.findIndex((r) => r.t >= L.t - 5 * 365.25 * DAY);
  const b = rows[i5 >= 0 ? i5 : 0];
  return {
    exch: meta.exchangeName || '', cur: meta.currency || '', type: meta.instrumentType || '',
    name: (meta.longName || meta.shortName || '').slice(0, 58),
    first: rows[0].d, last: L.d, n: rows.length, n1y: y1.length, nulls1y,
    flat: y2.length > 1 ? flat / (y2.length - 1) : 0, zeroVol, gap,
    pr5: L.c / b.c - 1, tr5: L.a / b.a - 1, from5: b.d,
  };
}

async function main() {
  const found = new Map(); // simbolo → gruppo
  for (const [g, s] of DIRECT) if (!found.has(s)) found.set(s, g);
  for (const [g, q] of QUERIES) {
    const j = await getJSON(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0&listsCount=0`);
    const syms = (j.quotes || []).filter((x) => x.symbol && EU.test(x.symbol));
    console.log(`search ${g.padEnd(6)} ${q.padEnd(40)} → ${syms.map((x) => x.symbol).join(' ') || (j.error || 'nessun risultato')}`);
    for (const x of syms) if (!found.has(x.symbol)) found.set(x.symbol, g);
    await sleep(250);
  }
  const list = [...found.entries()];
  const out = [];
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const [sym, g] = list[next++];
      const j = await getJSON(`/v8/finance/chart/${encodeURIComponent(sym)}?range=max&interval=1d&includeAdjustedClose=true`);
      const res = j.chart && j.chart.result && j.chart.result[0];
      out.push({ sym, g, info: res && res.timestamp ? describe(res) : null, err: j.error || (j.chart && j.chart.error && j.chart.error.code) || 'nessun dato' });
      await sleep(200);
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  const groups = [...new Set(list.map(([, g]) => g))];
  console.log('\nsimbolo      borsa cur type  | dal        al         barre | 1a  null flat% vol0 gap | 5a prezzo  5a TR    (da)       | nome');
  for (const g of groups) {
    console.log(`\n=== ${g} ===`);
    const rows = out.filter((r) => r.g === g).sort((a, b) => (a.info ? a.info.first : '9') < (b.info ? b.info.first : '9') ? -1 : 1);
    for (const r of rows) {
      const i = r.info;
      if (!i) { console.log(`${r.sym.padEnd(12)} — ${r.err}`); continue; }
      console.log(`${r.sym.padEnd(12)} ${i.exch.padEnd(5)} ${i.cur.padEnd(3)} ${i.type.slice(0, 5).padEnd(5)} | ${i.first} ${i.last} ${String(i.n).padStart(5)} | ${String(i.n1y).padStart(3)} ${String(i.nulls1y).padStart(4)} ${(i.flat * 100).toFixed(1).padStart(5)} ${String(i.zeroVol).padStart(4)} ${String(i.gap).padStart(3)} | ${pct(i.pr5)} ${pct(i.tr5)} (${i.from5}) | ${i.name}`);
    }
  }
  console.log(`\n${out.filter((r) => r.info).length}/${out.length} simboli con dati`);
}

main().catch((e) => { console.error(e); process.exit(1); });

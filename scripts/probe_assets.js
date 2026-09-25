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

// Seconda passata: qualità giornaliera a 5 anni (l'intervallo usato da fetch_data.js)
const SHORT = {
  DEV: ['SWDA.MI', 'EUNL.DE', 'XDWD.DE', 'URTH'],
  EM: ['EIMI.MI', 'IS3N.DE', 'IEEM.MI', 'XMME.DE', 'EEM'],
  GOV_BREVE: ['X13E.MI', 'DBXP.DE', 'EM13.MI', 'IBGS.MI', 'SHY'],
  GOV_MEDIO: ['CSBGE7.MI', 'SXRP.DE', 'EM35.MI', 'EM57.MI', 'X57E.MI', 'EM710.MI', 'IBGM.MI', 'IEI', 'IEF'],
  GOV_LUNGO: ['DBXF.DE', 'EM15.MI', 'X25E.MI', 'IBGL.MI', 'EM1015.MI', 'TLT'],
  GOV_AGGR: ['XGLE.MI', 'XGLE.DE'],
  US_GOV_EUR: ['IBTS.MI', 'CSBGU7.MI', 'IBTM.MI'],
  ORO: ['SGLD.MI', '4GLD.DE', 'GLD'],
  REIT: ['IWDP.MI', 'IQQ6.DE', 'VNQ', 'REET'],
  COMMODITY: ['CMOD.MI', 'WCOA.MI', 'COMO.PA', 'ICOM.L', 'DBC'],
  BTC: ['BTC-EUR', 'BTC-USD'],
  CASH: ['XEON.MI', 'XEON.DE'],
  FATTORI: ['IWVL.MI', 'IS3S.DE', 'IWQU.MI', 'IS3Q.DE', 'IWMO.MI', 'IS3R.DE', 'MVOL.MI', 'IQQ0.DE', 'IUSN.DE', 'ZPRS.DE',
    'XDEV.DE', 'XDEQ.DE', 'XDEM.DE', 'XDEB.DE', 'XDEV.MI', 'XDEQ.MI', 'XDEM.MI', 'XDEB.MI'],
};
const REFS = ['SWDA.MI', 'EUNL.DE'];

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
    rows.push({ d, c, a: adj[i] ?? c, v: q.volume ? q.volume[i] : null });
  }
  return { meta, rows, nulls };
}

async function main() {
  const syms = [...new Set([...REFS, ...Object.values(SHORT).flat()])];
  const data = new Map();
  let next = 0;
  async function worker() {
    while (next < syms.length) {
      const s = syms[next++];
      const j = await getJSON(`/v8/finance/chart/${encodeURIComponent(s)}?range=5y&interval=1d&includeAdjustedClose=true`);
      const res = j.chart && j.chart.result && j.chart.result[0];
      data.set(s, res && res.timestamp ? daily(res) : { err: j.error || 'nessun dato' });
      await sleep(200);
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  const refSets = Object.fromEntries(REFS.map((r) => [r, new Set((data.get(r).rows || []).map((x) => x.d))]));
  const last1y = (rows) => rows.filter((r) => r.d > '2025-09-24');
  console.log('simbolo      cur | dal        al         barre null | wkend | vs MIL -/+ (1a) | vs XETRA -/+ (1a) | flat% vol0 | max|r| (data)        | 5a prezzo 5a TR');
  for (const [g, list] of Object.entries(SHORT)) {
    console.log(`\n=== ${g} ===`);
    for (const s of list) {
      const x = data.get(s);
      if (!x || x.err) { console.log(`${s.padEnd(12)} — ${x ? x.err : '?'}`); continue; }
      const R = x.rows;
      const y = last1y(R);
      const set = new Set(y.map((r) => r.d));
      const cmp = (ref) => {
        const rs = [...refSets[ref]].filter((d) => d > '2025-09-24');
        const miss = rs.filter((d) => !set.has(d));
        const extra = y.filter((r) => !refSets[ref].has(r.d)).map((r) => r.d);
        return `${String(miss.length).padStart(3)}/${String(extra.length).padEnd(3)}`;
      };
      const wk = R.filter((r) => [0, 6].includes(new Date(r.d + 'T12:00:00Z').getUTCDay())).length;
      let flat = 0; for (let i = 1; i < y.length; i++) if (y[i].c === y[i - 1].c) flat++;
      const vol0 = y.filter((r) => r.v === 0).length;
      let mx = 0, mxd = '';
      for (let i = 1; i < R.length; i++) { const r = Math.abs(R[i].c / R[i - 1].c - 1); if (r > mx) { mx = r; mxd = R[i].d; } }
      const f = R[0], L = R[R.length - 1];
      console.log(`${s.padEnd(12)} ${(x.meta.currency || '').padEnd(3)} | ${f.d} ${L.d} ${String(R.length).padStart(5)} ${String(x.nulls).padStart(4)} | ${String(wk).padStart(5)} | ${cmp('SWDA.MI')}         | ${cmp('EUNL.DE')}           | ${(flat / Math.max(1, y.length - 1) * 100).toFixed(1).padStart(5)} ${String(vol0).padStart(4)} | ${(mx * 100).toFixed(1).padStart(5)}% (${mxd}) | ${pct(L.c / f.c - 1)} ${pct(L.a / f.a - 1)}`);
    }
  }
  // Festività: sedute di una borsa assenti nell'altra nell'ultimo anno
  const mil = [...refSets['SWDA.MI']].filter((d) => d > '2025-09-24');
  const xe = [...refSets['EUNL.DE']].filter((d) => d > '2025-09-24');
  console.log('\nMilano senza Xetra (1a):', xe.filter((d) => !refSets['SWDA.MI'].has(d)).join(' '));
  console.log('Xetra senza Milano (1a):', mil.filter((d) => !refSets['EUNL.DE'].has(d)).join(' '));
}

main().catch((e) => { console.error(e); process.exit(1); });

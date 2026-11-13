// Secondo giro del controllo del codice (1.6.0, commit 6fc67a1): scenari di fetch_vix.js con fetch simulato
// (mock_run.mjs di questa cartella, risposte vere registrate) e ATTESE scritte prima di guardare l'esito.
// Ogni attesa è un controllo che può fallire: sul commit 06a5360 (prima delle correzioni) devono fallire quelle nuove.
// Uso: WT=<copia di lavoro> CACHE=<risposte registrate> P150=<vix.json di origin/main> P160=<vix.json del commit> \
//      OUT=<file dei risultati> node scenari2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const { WT, CACHE, P150, P160, OUT = 'scenari2.txt' } = process.env;
const { decodeDates, deltaDecode } = await import(path.join(WT, 'js/indexdata.js'));
const FILE = path.join(WT, 'data/vix.json'), HERE = path.dirname(new URL(import.meta.url).pathname);
const dec = (x) => (x && x.cd ? { dates: decodeDates(x.d0, x.gaps), val: deltaDecode(x.cd, x.ps || 1) } : null);
const log = []; let fail = 0, n = 0;
const say = (s) => { log.push(s); console.log(s); };
const ok = (c, m) => { n++; if (!c) fail++; say(`${c ? 'OK  ' : 'FAIL'} ${m}`); };
const onlyStamp = (a, b) => { try { const x = JSON.parse(a), y = JSON.parse(b); delete x.generated; delete y.generated; return JSON.stringify(x) === JSON.stringify(y); } catch { return false; } };

function run(scen, prevFile) {
  if (prevFile) fs.copyFileSync(prevFile, FILE); else if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  const before = prevFile ? fs.readFileSync(prevFile, 'utf8') : null;
  const r = spawnSync(process.execPath, [path.join(HERE, 'mock_run.mjs')], { env: { ...process.env, SCEN: scen }, encoding: 'utf8' });
  const tag = /@@ .*exit=(\d+) attesa_virtuale_s=([\d.]+) richieste=(\d+) \[(.*)\]/.exec(r.stdout) || [];
  const after = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : null;
  const o = after ? JSON.parse(after) : null;
  const calls = (tag[4] || '').split(' ').filter(Boolean);
  const res = { scen, prev: prevFile ? path.basename(prevFile) : 'nessuno', exit: +tag[1], wait: +tag[2], calls, o, before, after, stderr: r.stderr || '',
    count: (k) => calls.filter((c) => c === k).length,
    last: (k) => { const s = o && dec(o.series[k]); return s ? [s.dates.at(-1), +s.val.at(-1).toFixed(4)] : null; } };
  say(`\n== ${scen} | prev ${res.prev} | exit ${res.exit} | attesa ${res.wait}s | richieste ${calls.length} [${calls.join(' ')}]`);
  if (o) say(`   asOf ${JSON.stringify(o.asOf)} missing ${JSON.stringify(o.missing)} VIX ${JSON.stringify(res.last('VIX'))} VIX3M ${JSON.stringify(res.last('VIX3M'))}`);
  for (const e of res.stderr.split('\n').filter((x) => x && !/^(Note|Errori):$/.test(x)).slice(0, 6)) say(`   ! ${e.slice(0, 220)}`);
  return res;
}
const src = (r) => r.o && r.o.asOf ? [r.o.asOf.vixSrc, r.o.asOf.vix3mSrc] : null;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// file pubblicato con l'ultima seduta da Yahoo (lo produce lo scenario cboeLate partendo dal file del commit)
const P160Y = path.join(path.dirname(P160), 'vix160_yahoo.json');

// ---------- 1. fonte dell'ultima seduta ----------
let r = run('ok', null);
ok(eq(src(r), ['Cboe', 'Cboe']), `Cboe aggiornato, senza file: fonte ${JSON.stringify(src(r))} (attesa Cboe, Cboe)`);
ok(eq(r.last('VIX'), ['2026-11-06', 25.64]) && r.o.asOf.fred === '2026-11-05', `Cboe aggiornato: VIX ${JSON.stringify(r.last('VIX'))}, FRED al ${r.o.asOf.fred}`);
ok(r.o.series.VIX.ps === 10000, `ps del VIX ${r.o.series.VIX.ps} (atteso 10000)`);
ok(r.count('yahoo_VIX') === 0 && r.count('yahoo_VIX3M') === 0, `Cboe aggiornato: Yahoo per VIX e VIX3M non chiesto (${r.count('yahoo_VIX')}, ${r.count('yahoo_VIX3M')})`);
const fresh = r.after;

r = run('ok', P160);
ok(r.exit === 0 && onlyStamp(r.before, r.after), `Cboe aggiornato sul file del commit: cambia solo «generated» (${onlyStamp(r.before, r.after)})`);

r = run('ok', P150);
{
  const a = dec(JSON.parse(r.before).series.VIX), b = dec(r.o.series.VIX), p = JSON.parse(r.before).series.VIX;
  const diff = a.dates.map((d, i) => (b.dates[i] !== d || Math.abs(b.val[i] - a.val[i]) > 1e-9 ? d : null)).filter(Boolean);
  ok(r.o.series.VIX.ps === p.ps && r.o.series.VIX.d0 === p.d0 && r.o.series.VIX.gaps === p.gaps && eq(r.o.series.VIX.cd, p.cd), `file della 1.5.0: VIX identico (d0, gaps, ps ${r.o.series.VIX.ps}, cd di ${p.cd.length} valori); date o valori diversi: ${diff.length}`);
  ok(eq(r.o.series.SPX, JSON.parse(r.before).series.SPX) && eq(r.o.series.NDX, JSON.parse(r.before).series.NDX), 'file della 1.5.0: SPX e NDX identici');
  ok(eq(src(r), ['Cboe', 'Cboe']), `file della 1.5.0: fonte ${JSON.stringify(src(r))}`);
}

r = run('cboeLate', null);
ok(eq(src(r), ['Yahoo', 'Yahoo']) && eq(r.last('VIX'), ['2026-11-06', 25.64]), `Cboe in ritardo → Yahoo: fonte ${JSON.stringify(src(r))}, VIX ${JSON.stringify(r.last('VIX'))}`);
r = run('cboeLate', P160);
ok(eq(src(r), ['Yahoo', 'Yahoo']), `Cboe in ritardo sul file del commit (stessi valori, fonte cambiata Cboe → Yahoo): fonte ${JSON.stringify(src(r))}`);
fs.writeFileSync(P160Y, r.after);
r = run('ok', P160Y);
ok(eq(src(r), ['Cboe', 'Cboe']) && !onlyStamp(r.before, r.after), `stessi valori, fonte cambiata Yahoo → Cboe: si scrive, fonte ${JSON.stringify(src(r))}`);
{
  const a = JSON.parse(r.before).series.VIX, b = r.o.series.VIX;
  ok(a.cd.length === b.cd.length && eq(a.cd, b.cd) && a.ps === b.ps, 'stessi valori, fonte cambiata: cd e ps del VIX invariati (cambia solo src)');
}
r = run('cboeLate3m', null);
ok(eq(src(r), ['Cboe', 'Yahoo']), `in ritardo solo il VIX3M: fonte ${JSON.stringify(src(r))} (attesa Cboe, Yahoo)`);
r = run('cboeDown', null);
ok(eq(src(r), ['Yahoo', 'Yahoo']) && r.count('cboe_VIX') === 1 && r.count('cboe_VIX3M') === 1, `Cboe 403: un solo tentativo per file (${r.count('cboe_VIX')}, ${r.count('cboe_VIX3M')}), fonte ${JSON.stringify(src(r))}`);
r = run('cboe503', null);
ok(eq(src(r), ['Yahoo', 'Yahoo']) && r.count('cboe_VIX') === 3 && r.count('cboe_VIX3M') === 0, `Cboe 503: 3 tentativi sul VIX, VIX3M non chiesto (${r.count('cboe_VIX')}, ${r.count('cboe_VIX3M')}), fonte ${JSON.stringify(src(r))}`);
r = run('cboe404VIX3M', null);
ok(eq(src(r), ['Cboe', 'Yahoo']) && r.count('cboe_VIX3M') === 1 && r.count('yahoo_VIX') === 0, `solo il file del VIX3M 404: fonte ${JSON.stringify(src(r))}, Yahoo ^VIX non chiesto`);
r = run('cboeEmpty', null);
ok(eq(src(r), ['Yahoo', 'Yahoo']) && r.count('cboe_VIX3M') === 0, `Cboe vuoto: fonte ${JSON.stringify(src(r))}, VIX3M di Cboe chiesto ${r.count('cboe_VIX3M')} volte`);
r = run('cboeNoSess', null);
ok(eq(src(r), ['Yahoo', 'Yahoo']) && eq(r.last('VIX'), ['2026-11-06', 25.64]), `Cboe senza sedute dell'S&P 500 (vuoto dopo il filtro): fonte ${JSON.stringify(src(r))}, VIX ${JSON.stringify(r.last('VIX'))}, Yahoo ^VIX chiesto ${r.count('yahoo_VIX')} volte (attesa Yahoo)`);
r = run('cboeYahooDownNet', P160);
ok(eq(src(r), ['Cboe', 'Cboe']) && onlyStamp(r.before, r.after), `Cboe e Yahoo giù, coda dal file pubblicato (Cboe): fonte ${JSON.stringify(src(r))}, file invariato ${onlyStamp(r.before, r.after)}`);
r = run('cboeYahooDownNet', P160Y);
ok(eq(src(r), ['Yahoo', 'Yahoo']) && onlyStamp(r.before, r.after), `Cboe e Yahoo giù, coda dal file pubblicato (Yahoo): fonte ${JSON.stringify(src(r))}`);
r = run('cboeYahooDownNet', P150);
ok(r.o.asOf.vixSrc !== 'Cboe', `Cboe e Yahoo giù, coda dal file della 1.5.0 (ultima seduta di Yahoo, src assente): fonte ${JSON.stringify(src(r))} (attesa Yahoo o null, non Cboe)`);

// ---------- 2. plausibilità ----------
for (const [s, what] of [['cboeWild', '2564 invece di 25,64'], ['cboeLow', '0,2564'], ['yahooWild', 'Yahoo 256,4 con Cboe in ritardo'], ['cboeDup', 'data ripetuta con 99,99']]) {
  r = run(s, null);
  ok(r.exit === 0 && r.last('VIX') && r.last('VIX')[1] < 100 && r.last('VIX')[1] > 1 && /non plausibili/.test(r.stderr) && r.o.series.VIX.ps === 10000, `${what}: scartato (VIX ${JSON.stringify(r.last('VIX'))}, ps ${r.o && r.o.series.VIX.ps}, fonte ${JSON.stringify(src(r))})`);
  ok(r.o.asOf.vixSrc === 'FRED' && r.o.asOf.vix === '2026-11-05', `${what}: la serie finisce all'ultimo FRED con fonte FRED (${r.o.asOf.vix}, ${r.o.asOf.vixSrc})`);
  const r2 = run(s, P160);
  // (con Cboe in ritardo anche il VIX3M passa a Yahoo con lo stesso valore: lì cambia solo la sua fonte, quindi si guarda il VIX)
  const B = JSON.parse(r2.before);
  ok(r2.exit === 0 && eq(r2.o.series.VIX, B.series.VIX) && r2.o.asOf.vix === B.asOf.vix && r2.o.asOf.vixSrc === B.asOf.vixSrc, `${what}, file del commit: resta il VIX pubblicato (${r2.o.asOf.vix}, ${r2.o.asOf.vixSrc}; file intero invariato: ${onlyStamp(r2.before, r2.after)})`);
}
r = run('cboeDupOk', null);
ok(r.exit === 0 && eq(r.last('VIX'), ['2026-11-06', 25.64]), `ultima data due volte (25,00 poi 25,64): vale l'ultima riga ${JSON.stringify(r.last('VIX'))}`);
r = run('cboeDupMid', null);
ok(r.exit === 0 && eq(src(r), ['Cboe', 'Cboe']), `prima data ripetuta: file scritto, fonte ${JSON.stringify(src(r))}`);

// ---------- 3. corto circuito ----------
r = run('vix3m404', null);
ok(r.o && r.o.series.HYGIEF && r.count('yahoo_HYG') === 1 && r.count('yahoo_IEF') === 1, `Cboe in ritardo e ^VIX3M 404: HYG e IEF chiesti (${r.count('yahoo_HYG')}, ${r.count('yahoo_IEF')}), credito ${r.o && r.o.asOf.credit}`);
ok(r.o.asOf.vix3mSrc === 'FRED' && r.o.asOf.vixSrc === 'Yahoo', `… fonte ${JSON.stringify(src(r))} (attesa Yahoo, FRED)`);
r = run('cboeLateVix404', null);
ok(r.o && r.o.series.HYGIEF && r.count('yahoo_VIX3M') === 1, `Cboe in ritardo e ^VIX 404: ^VIX3M, HYG e IEF chiesti, credito ${r.o && r.o.asOf.credit}`);
r = run('yahooDown', null);
ok(r.count('yahoo_HYG') === 0 && r.count('yahoo_IEF') === 0 && r.count('yahoo_GSPC') === 4, `Yahoo giù (errore di rete): 4 tentativi sul primo simbolo, HYG e IEF non chiesti (${r.count('yahoo_GSPC')}, ${r.count('yahoo_HYG')})`);
r = run('cboeLateYahooNoData', null);
say(`   (informativo) ^VIX3M risponde 200 senza dati: HYG chiesto ${r.count('yahoo_HYG')} volte, credito ${r.o && r.o.asOf.credit}`);

// ---------- 4. tempi nel caso peggiore (orologio virtuale; il passo ha 8 minuti = 480 s) ----------
for (const [s, pf] of [['allHang', null], ['allHang', P160], ['allHang', P150], ['cboeHang', P160], ['cboeDownYahooHang', P160], ['cboeHangOnly3m', P160], ['fredHang', P160], ['yahooHang', P160]]) {
  r = run(s, pf);
  ok(r.wait <= 400, `${s} (${r.prev}): attesa ${r.wait} s (≤ 400 s; il passo ha 480 s), exit ${r.exit}, richieste ${r.calls.length}`);
  if (pf) ok(r.exit === 0 && JSON.parse(r.after).asOf.vix === '2026-11-06', `${s} (${r.prev}): file scritto, VIX al ${r.o && r.o.asOf.vix}`);
}

say(`\n${n} controlli, ${fail} FAIL`);
fs.writeFileSync(OUT, log.join('\n') + '\n');

#!/usr/bin/env python3
"""
verifica.py — ricalcolo indipendente dei numeri chiave di ricerca/cicli/lead-lag/risultati.json (scritto da leadlag.mjs).

Codice separato, altri algoritmi:
  - legge i file grezzi di Yahoo ricerca/rotazione-bolle/cache/Y_*.json (non serie.json) e li pulisce per conto suo;
  - punti di svolta a forza bruta (finestra di 365 giorni riletta a ogni seduta, ricerca in avanti seduta per seduta);
  - raggruppamento gerarchico ingenuo (tutte le coppie di gruppi a ogni passo, ampiezza ricalcolata dai membri);
  - concordanza e fuori campione con scipy.stats.spearmanr;
  - coppie: confronto con tutti i punti di B (non ricerca binaria), p binomiale con scipy, Benjamini-Hochberg con
    scipy.stats.false_discovery_control;
  - modello nullo rifatto con numpy (altro generatore, meno ripetizioni): i p devono coincidere entro l'errore Monte Carlo;
  - utilità e valori di oggi ricalcolati.
Stampa le differenze; esce con codice 1 se ce ne sono.

Uso: python3 -I ricerca/cicli/lead-lag/script/verifica.py [--null-reps 500] [--risultati altro.json]
(con --risultati si può provare che il controllo trova valori alterati di proposito)
"""
import json, os, sys, datetime as dt
import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(BASE)))
CACHE = os.path.join(ROOT, 'ricerca', 'rotazione-bolle', 'cache')
NULL_REPS = int(sys.argv[sys.argv.index('--null-reps') + 1]) if '--null-reps' in sys.argv else 500

SYM = {'BTC': 'BTC-USD', 'GOLD': 'GC=F', 'SILVER': 'SI=F', 'COPPER': 'HG=F', 'WTI': 'CL=F', 'NDX': '^NDX', 'SPX': '^GSPC', 'SOXX': 'SOXX', 'KOSPI': '^KS11'}
IDS = list(SYM)
XS = [15, 20, 30]
TYPES = ['peak', 'trough']
EPOCH = dt.date(1970, 1, 1)
day = lambda s: (dt.date.fromisoformat(s) - EPOCH).days
iso = lambda d: (EPOCH + dt.timedelta(days=int(round(d)))).isoformat()

RFILE = sys.argv[sys.argv.index('--risultati') + 1] if '--risultati' in sys.argv else os.path.join(BASE, 'risultati.json')
R = json.load(open(RFILE, encoding='utf-8'))
diffs = []
def cmp(what, a, b, tol=0):
    ok = (a == b) if tol == 0 else (a is not None and b is not None and abs(a - b) <= tol) or (a is None and b is None)
    if not ok:
        diffs.append(f'{what}: verifica={a} risultati={b}')

# ---------- dati grezzi ----------
S = {}
for m, sym in SYM.items():
    fn = 'Y_' + ''.join(c if (c.isalnum() or c in '_.-') else '_' for c in sym) + '.json'
    y = json.load(open(os.path.join(CACHE, fn), encoding='utf-8'))
    rows = [(d, c) for d, c in zip(y['dates'], y['close']) if c is not None and c == c and c > 0]
    S[m] = rows
END = min(day(S[m][-1][0]) for m in IDS)
cmp('ultima seduta comune', iso(END), R['asOf'])
WIN = {m: (max(day(S[m][0][0]) + 365, day('1999-01-01')), END) for m in IDS}

# ---------- punti di svolta a forza bruta ----------
def brute(rows, X, typ):
    t = [day(d) for d, _ in rows]; c = [v for _, v in rows]; n = len(c)
    el = t[0] + 365
    out = []
    for i in range(n):
        if t[i] < el or t[i] < day('1998-01-01'):  # prima del 1998 non serve (il periodo parte dal 1999)
            continue
        # la finestra: tutte le sedute con t ≥ t[i] − 365 e prima di i
        k = i - 1; prev = []
        while k >= 0 and t[k] >= t[i] - 365:
            prev.append(c[k]); k -= 1
        if not prev:
            continue
        if typ == 'peak' and not c[i] > max(prev):
            continue
        if typ == 'trough' and not c[i] < min(prev):
            continue
        conf = None
        for q in range(i + 1, n):
            if (typ == 'peak' and c[q] > c[i]) or (typ == 'trough' and c[q] < c[i]):
                break
            if (typ == 'peak' and c[q] <= c[i] * (1 - X / 100)) or (typ == 'trough' and c[q] >= c[i] * (1 + X / 100)):
                conf = q; break
        if conf is not None:
            out.append((t[i], t[conf]))
    return out

TP = {}
for m in IDS:
    TP[m] = {}
    for ty in TYPES:
        TP[m][ty] = {}
        for X in XS:
            pts = [p for p in brute(S[m], X, ty) if WIN[m][0] <= p[0] <= END]
            TP[m][ty][X] = pts
            mine = [(iso(a), iso(b)) for a, b in pts]
            theirs = [(p['date'], p['conf']) for p in R['points'][m][f'{ty}{X}']]
            cmp(f'punti {m} {ty}{X}', mine, theirs)
print('punti di svolta: confrontati', sum(len(TP[m][ty][X]) for m in IDS for ty in TYPES for X in XS))

# ---------- raggruppamento ingenuo ----------
def cluster_naive(pts, D=365):
    # pts: lista di (m, t); gruppi come liste di indici
    G = [[i] for i in range(len(pts))]
    while True:
        best = None
        for x in range(len(G)):
            for y in range(len(G)):
                if x == y:
                    continue
                a, b = G[x], G[y]
                amin, bmin = min(pts[i][1] for i in a), min(pts[i][1] for i in b)
                if (amin, min(a)) > (bmin, min(b)):
                    continue  # ogni coppia una volta: a = quello che inizia prima
                if set(pts[i][0] for i in a) & set(pts[i][0] for i in b):
                    continue
                ts = [pts[i][1] for i in a + b]
                span = max(ts) - min(ts)
                if span > D:
                    continue
                key = (span, amin, bmin, min(a), min(b))
                if best is None or key < best[0]:
                    best = (key, x, y)
        if best is None:
            break
        _, x, y = best
        G[x] = G[x] + G[y]
        del G[y]
    return G

def cycles_of(pts, G, min_size=3):
    out = []
    for g in G:
        if len(g) < min_size:
            continue
        out.append({'t': float(np.median([pts[i][1] for i in g])), 'pts': {pts[i][0]: pts[i][1] for i in g}})
    return sorted(out, key=lambda c: c['t'])

def conc(cyc):
    vals = []
    for i in range(len(cyc)):
        for j in range(i + 1, len(cyc)):
            ms = [m for m in cyc[i]['pts'] if m in cyc[j]['pts']]
            if len(ms) < 3:
                continue
            a = [cyc[i]['pts'][m] for m in ms]; b = [cyc[j]['pts'][m] for m in ms]
            if len(set(a)) < 2 or len(set(b)) < 2:
                continue
            vals.append(stats.spearmanr(a, b).statistic)
    return (float(np.mean(vals)) if vals else None), len(vals)

def norm_ranks(p):
    ms = list(p); r = stats.rankdata([p[m] for m in ms]); k = len(ms)
    return {m: (r[i] - 1) / (k - 1) for i, m in enumerate(ms)}

def oos(cyc, split=day('2012-12-31')):
    est = {}
    for c in cyc:
        if c['t'] <= split:
            for m, v in norm_ranks(c['pts']).items():
                est.setdefault(m, []).append(v)
    est = {m: float(np.mean(v)) for m, v in est.items()}
    vals = []
    for c in cyc:
        if c['t'] <= split:
            continue
        ms = [m for m in c['pts'] if m in est]
        if len(ms) < 3:
            continue
        a = [est[m] for m in ms]; b = [c['pts'][m] for m in ms]
        if len(set(a)) < 2 or len(set(b)) < 2:
            continue
        vals.append(stats.spearmanr(a, b).statistic)
    return (float(np.mean(vals)) if vals else None), len(vals)

ORDER = {}
for ty in TYPES:
    for X in XS:
        key = f'{ty}{X}'
        pts = [(m, a) for m in IDS for a, _ in TP[m][ty][X]]
        cyc = cycles_of(pts, cluster_naive(pts))
        ORDER[key] = (pts, cyc)
        mine = [[(m, iso(t)) for m, t in sorted(c['pts'].items(), key=lambda kv: (kv[1], IDS.index(kv[0])))] for c in cyc]
        theirs = [[(x['m'], x['date']) for x in c['markets']] for c in R['order'][key]['list']]
        cmp(f'cicli {key}', sorted(mine), sorted(theirs))  # stesso contenuto, l'ordine della lista non conta
        rho, npairs = conc(cyc)
        cmp(f'concordanza {key}', rho, R['order'][key]['concordance']['rho'], 1e-9)
        cmp(f'coppie di cicli {key}', npairs, R['order'][key]['concordance']['pairs'])
        o, nc = oos(cyc)
        cmp(f'fuori campione {key}', o, R['order'][key]['oos']['rho'], 1e-9)
        cmp(f'cicli fuori campione {key}', nc, R['order'][key]['oos']['cycles'])
print('cicli, concordanza e fuori campione: ricalcolati')

# ---------- modello nullo rifatto (numpy, altro generatore) ----------
def cluster_fast(pts, D=365):
    # stesso criterio, scritto di nuovo: gruppi ordinati per inizio, solo coppie con inizio entro D
    G = [{'mem': [i], 'mn': pts[i][1], 'mx': pts[i][1], 'mk': {pts[i][0]}} for i in range(len(pts))]
    G.sort(key=lambda g: (g['mn'], g['mem'][0]))
    while True:
        best = None
        for x in range(len(G)):
            a = G[x]
            for y in range(x + 1, len(G)):
                b = G[y]
                if b['mn'] - a['mn'] > D:
                    break
                span = max(a['mx'], b['mx']) - a['mn']
                if span > D or (a['mk'] & b['mk']):
                    continue
                k = (span, a['mn'], x, y)
                if best is None or k < best:
                    best = k
        if best is None:
            break
        _, _, x, y = best
        a, b = G[x], G[y]
        G[x] = {'mem': a['mem'] + b['mem'], 'mn': min(a['mn'], b['mn']), 'mx': max(a['mx'], b['mx']), 'mk': a['mk'] | b['mk']}
        del G[y]
        G.sort(key=lambda g: (g['mn'], g['mem'][0]))
    return [g['mem'] for g in G]

rs = np.random.default_rng(12345)
nullchk = {}
for key in ['peak15', 'peak20', 'trough15']:
    pts, cyc = ORDER[key]
    rho_obs, _ = conc(cyc); oo_obs, _ = oos(cyc)
    ge_c = ge_o = 0
    for r in range(NULL_REPS):
        off = {m: int(rs.integers(0, WIN[m][1] - WIN[m][0] + 1)) for m in IDS}
        sp = [(m, WIN[m][0] + (t - WIN[m][0] + off[m]) % (WIN[m][1] - WIN[m][0] + 1)) for m, t in pts]
        c2 = cycles_of(sp, cluster_fast(sp))
        a, _ = conc(c2); b, _ = oos(c2)
        ge_c += (a is None or a >= rho_obs); ge_o += (b is None or b >= oo_obs)
    pc, po = (1 + ge_c) / (1 + NULL_REPS), (1 + ge_o) / (1 + NULL_REPS)
    jc, jo = R['order'][key]['concordance']['p'], R['order'][key]['oos']['p']
    # tolleranza: 4 errori standard Monte Carlo del calcolo con meno ripetizioni
    tol = lambda p: 4 * np.sqrt(max(p, 0.01) * (1 - p) / NULL_REPS)
    cmp(f'p nullo concordanza {key} (MC)', round(pc, 4), round(jc, 4), tol(jc))
    cmp(f'p nullo fuori campione {key} (MC)', round(po, 4), round(jo, 4), tol(jo))
    nullchk[key] = {'conc': [pc, jc], 'oos': [po, jo]}
print('nullo (Python, %d ripetizioni) contro risultati:' % NULL_REPS, json.dumps(nullchk))

# ---------- coppie ----------
pairs = {(p['type'], p['X'], p['A'], p['B']): p for p in R['pairs']}
cmp('numero di test di coppia', len(pairs), 2 * 3 * 72)
def pair_cases(aT, bT, lo, hi):
    out = []
    for a in aT:
        if not (lo <= a <= hi):
            continue
        cand = [b - a for b in bT if abs(b - a) <= 365]
        if not cand:
            continue
        out.append((a, min(cand, key=lambda o: (abs(o), o))))
    return out

n_checked = 0
for (ty, X, A, B), p in pairs.items():
    aT = [a for a, _ in TP[A][ty][X]]; bT = [b for b, _ in TP[B][ty][X]]
    lo = max(day('2000-01-01'), WIN[A][0], WIN[B][0] + 365); hi = END - 365
    cs = pair_cases(aT, bT, lo, hi)
    after = sum(1 for _, o in cs if o >= 1)
    cmp(f'casi {ty}{X} {A}->{B}', len(cs), p['cases'])
    cmp(f'dopo {ty}{X} {A}->{B}', after, p['after'])
    if cs:
        cmp(f'scarto mediano {ty}{X} {A}->{B}', float(np.median([o for _, o in cs])), p['medianOff'], 1e-9)
        cmp(f'p binomiale {ty}{X} {A}->{B}', float(stats.binom.sf(after - 1, len(cs), 0.5)), p['pBinom'], 1e-9)
    for h, (l2, h2) in (('h1', (day('2000-01-01'), day('2012-12-31'))), ('h2', (day('2013-01-01'), hi))):
        hc = [(a, o) for a, o in cs if l2 <= a <= h2]
        cmp(f'{h} casi {ty}{X} {A}->{B}', len(hc), p[h]['cases'])
        cmp(f'{h} dopo {ty}{X} {A}->{B}', sum(1 for _, o in hc if o >= 1), p[h]['after'])
    n_checked += 1
valid = [p for p in R['pairs'] if p['pNull'] is not None]
q = stats.false_discovery_control([p['pNull'] for p in valid], method='bh')
for p, qq in zip(valid, q):
    cmp(f"BH {p['type']}{p['X']} {p['A']}->{p['B']}", float(qq), p['qBH'], 1e-9)
passing = [f"{p['type']}{p['X']} {p['A']}→{p['B']}" for p in R['pairs']
           if p['share'] is not None and p['share'] >= 0.75 and p['cases'] >= 8 and p['qBH'] < 0.05 and 'BTC' not in (p['A'], p['B'])
           and all(p[h]['cases'] >= 3 and p[h]['share'] >= 0.75 for h in ('h1', 'h2'))]
cmp('coppie che passano il criterio 2', passing, R['criteria']['c2']['passing'])
print('coppie: ricontrollate', n_checked, '; passano il criterio 2:', passing)

# nullo delle coppie rifatto con numpy per le 12 coppie con il p più basso
top = sorted(valid, key=lambda p: (p['pNull'], -p['share']))[:12]
PR = 10000
rs2 = np.random.default_rng(777)
for p in top:
    ty, X, A, B = p['type'], p['X'], p['A'], p['B']
    aT = np.array([a for a, _ in TP[A][ty][X]]); bT = np.array([b for b, _ in TP[B][ty][X]])
    lo = max(day('2000-01-01'), WIN[A][0], WIN[B][0] + 365); hi = END - 365
    aT = aT[(aT >= lo) & (aT <= hi)]
    L = WIN[B][1] - WIN[B][0] + 1
    u = rs2.integers(730, L - 730 + 1, size=PR)
    sh = WIN[B][0] + (bT[None, :] - WIN[B][0] + u[:, None]) % L            # PR × nB
    off = sh[:, None, :] - aT[None, :, None]                               # PR × nA × nB
    ab = np.abs(off).astype(float); ab[ab > 365] = np.inf
    # più vicino, a pari distanza quello prima (scarto negativo): chiave |o| poi o
    keyv = ab * 4 + (off > 0)
    idx = keyv.argmin(axis=2)
    best = np.take_along_axis(off, idx[:, :, None], axis=2)[:, :, 0]
    has = np.isfinite(np.take_along_axis(ab, idx[:, :, None], axis=2)[:, :, 0])
    nc = has.sum(axis=1); na = ((best >= 1) & has).sum(axis=1)
    share = np.where(nc > 0, na / np.maximum(nc, 1), -1)
    ge = int(((nc == 0) | (share >= p['share'] - 1e-12)).sum())
    pp = (1 + ge) / (1 + PR)
    tol = 4 * np.sqrt(max(p['pNull'], 0.001) * (1 - p['pNull']) / PR) + 2 / PR
    cmp(f'p nullo coppia {ty}{X} {A}->{B} (MC)', round(pp, 5), round(p['pNull'], 5), tol)
    print(f'  {ty}{X} {A}->{B}: casi {p["cases"]}, quota {p["share"]:.3f}, p nullo JS {p["pNull"]:.5f}, Python {pp:.5f}')

# ---------- utilità ----------
for u in R['utility']['rows']:
    A, B = u['pair'].split('→'); ty, X = u['type'], u['X']
    pr = pairs[(ty, X, A, B)]
    lo, hi = day(pr['aFrom']), day(pr['aTo'])
    hits = 0; leads = []; base = 0.0
    bT = [b for b, _ in TP[B][ty][X]]
    days = np.arange(lo, hi + 1)
    for a, c in TP[A][ty][X]:
        if not (lo <= a <= hi):
            continue
        Lw = a + 365 - c
        h = [b for b in bT if c < b <= a + 365]
        if h:
            hits += 1; leads.append(h[0] - c)
        if Lw > 0:
            bb = np.array(bT)
            base += float(np.mean([(np.any((bb > d) & (bb <= d + Lw))) for d in days]))
    cmp(f'utilità colpi {u["pair"]} {ty}{X}', hits, u['hits'])
    cmp(f'utilità base {u["pair"]} {ty}{X}', round(base / max(u['n'], 1), 9), round(u['baseRate'], 9), 1e-6)
    cmp(f'utilità anticipo {u["pair"]} {ty}{X}', float(np.median(leads)) if leads else None, u['medianLead'], 1e-9)
print('utilità: ricontrollate', len(R['utility']['rows']))

# ---------- oggi ----------
for m in IDS:
    rows = S[m]; tl = day(rows[-1][0]); last = rows[-1][1]
    w = [(d, c) for d, c in rows if day(d) >= tl - 365]
    hi_ = max(w, key=lambda x: (x[1], x[0]))  # a parità la più recente
    cmp(f'oggi {m} distanza dal massimo', round((last / hi_[1] - 1) * 100, 6), round(R['today'][m]['fromHi'], 6), 1e-6)

print('\nDIFFERENZE:', len(diffs))
for d in diffs[:60]:
    print(' -', d)
sys.exit(1 if diffs else 0)

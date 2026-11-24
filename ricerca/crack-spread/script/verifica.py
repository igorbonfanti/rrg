#!/usr/bin/env python3
"""
verifica.py — ricalcolo indipendente (Python, numpy/pandas, algoritmi scritti da capo) dei numeri chiave di backtest.mjs.
Legge solo i file grezzi di ../cache (CSV di FRED, JSON di Yahoo), non usa js/peaks.js né lib.mjs. Confronta con
../risultati.json e scrive ../verifica.json con le differenze.
Algoritmi diversi: massimi di 52 settimane e calo di conferma per forza bruta (finestre esplicite), percentile con
numpy.percentile su tutta la storia di ogni giorno, regressioni con numpy.linalg.lstsq, modello nullo con il generatore
di numpy (quindi i valori p si confrontano con una tolleranza, non al decimale).
Uso: python3 -I ricerca/crack-spread/script/verifica.py
"""
import json, math, os, sys
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '..', 'cache')
OUT = os.path.join(HERE, '..')
D = lambda s: date.fromisoformat(s)
HALF_END = date(2005, 12, 31)
half = lambda d: '1986-2005' if d <= HALF_END else '2006-oggi'
EXCL = {date(2020, 4, 20)}


def fred(i):
    df = pd.read_csv(os.path.join(CACHE, f'fred_{i}.csv'))
    df.columns = ['d', 'v']
    df['v'] = pd.to_numeric(df['v'], errors='coerce')
    df = df.dropna()
    return {D(a): float(b) for a, b in zip(df['d'], df['v'])}


def yahoo(sym, adj=False):
    j = json.load(open(os.path.join(CACHE, f"yahoo_{sym.replace('^', '').replace('=', '')}.json")))
    tz = ZoneInfo(j['meta'].get('exchangeTimezoneName', 'America/New_York'))
    q = j['indicators']['quote'][0]
    c = j['indicators']['adjclose'][0]['adjclose'] if adj else q['close']
    out = {}
    for ts, v, cc in zip(j['timestamp'], c, q['close']):
        if v is None or cc is None:
            continue
        d = datetime.fromtimestamp(ts, timezone.utc).astimezone(tz).date()
        if d >= date(2026, 11, 24):  # barra della seduta in corso al momento del download
            continue
        out[d] = float(v)
    return out


W, G, H = fred('DCOILWTICO'), fred('DGASNYH'), fred('DHOILNYH')
cd = sorted(d for d in G if d in W and d in H and d not in EXCL and W[d] > 0)
crack = pd.Series([14 * (2 * G[d] + H[d]) - W[d] for d in cd], index=cd)
cw = pd.Series([W[d] for d in cd], index=cd)
wd = sorted(d for d in W if d not in EXCL and W[d] > 0)
wti = pd.Series([W[d] for d in wd], index=wd)


def peaks(s, X):
    """massimi di ciclo, forza bruta: massimo di 52 settimane (sopra tutte le chiusure dei 365 giorni prima, con un anno di
    storia), confermato da un calo ≥ X% prima della prima chiusura strettamente più alta"""
    d = list(s.index); v = s.values; n = len(v); first = d[0]
    out = []
    lo = 0
    for i in range(n):
        if d[i] < first + timedelta(days=365):
            continue
        while d[lo] < d[i] - timedelta(days=365):
            lo += 1
        if lo >= i or v[i] <= v[lo:i].max():
            continue
        # prima chiusura più alta
        hi = np.nonzero(v[i + 1:] > v[i])[0]
        j = i + 1 + hi[0] if len(hi) else n
        seg = v[i + 1:j]
        if len(seg) and seg.min() <= v[i] * (1 - X / 100):
            out.append((d[i], v[i]))
    return out


def cases(wp, cp, first, last):
    res = []
    for p, _ in wp:
        if not (first + timedelta(days=365) <= p - timedelta(days=365) and p + timedelta(days=365) <= last):
            continue
        cand = [(q, v) for q, v in cp if p - timedelta(days=365) <= q <= p + timedelta(days=365)]
        if not cand:
            res.append((p, None)); continue
        best = cand[0]
        for c in cand[1:]:
            if c[1] > best[1]:
                best = c
        res.append((p, (best[0] - p).days))
    return res


def before(cs):
    return sum(1 for _, o in cs if o is not None and o < -31)


V = {}
rng = np.random.default_rng(2026)
for X in (20, 30):
    wp, cp = peaks(wti, X), peaks(crack, X)
    first, last = cd[0], cd[-1]
    cs = cases(wp, cp, first, last)
    L = (last - first).days + 1
    obs = {}
    for h in ('tutto', '1986-2005', '2006-oggi'):
        sub = [c for c in cs if h == 'tutto' or half(c[0]) == h]
        obs[h] = (before(sub), len(sub))
    ge = {h: 0 for h in obs}
    NN = 5000
    for _ in range(NN):
        k = int(rng.integers(1, L))
        sh = [(first + timedelta(days=((q - first).days + k) % L), v) for q, v in cp]
        c2 = cases(wp, sh, first, last)
        for h in obs:
            sub = [c for c in c2 if h == 'tutto' or half(c[0]) == h]
            if sub and before(sub) / len(sub) >= obs[h][0] / obs[h][1] - 1e-12:
                ge[h] += 1
    V[f'c1_X{X}'] = {h: {'prima': obs[h][0], 'casi': obs[h][1], 'p': round((1 + ge[h]) / (1 + NN), 4)} for h in obs}
    V[f'c1_X{X}']['massimi'] = [len(wp), len(cp)]

# ---------------------------------------------------------------- criterio 2
spx = pd.Series(yahoo('^GSPC'))
spx = spx.sort_index()


def zz(s, X=10):
    d = list(s.index); v = s.values
    ev = []; down = False; pk = 0; tr = 0; cf = None
    for i in range(1, len(v)):
        if not down:
            if v[i] > v[pk]: pk = i
            elif v[i] <= v[pk] * (1 - X / 100): down = True; tr = i; cf = i
        else:
            if v[i] < v[tr]: tr = i
            elif v[i] >= v[tr] * (1 + X / 100): ev.append((d[cf], d[i])); down = False; pk = i
    if down: ev.append((d[cf], None))
    return ev


EV = zz(spx)
conf = np.array([np.datetime64(c) for c, _ in EV])
def is_open(d):
    return any(c <= d and (e is None or d < e) for c, e in EV)
def hit(d):
    return any(d < c <= d + timedelta(days=365) for c, _ in EV)


def lag(idx, i):
    t = idx[i] - timedelta(days=91)
    j = np.searchsorted(np.array(idx, dtype='datetime64[D]'), np.datetime64(t), side='right') - 1
    if j >= 0 and (idx[i] - idx[j]).days <= 122:
        return j
    return -1


def extreme(s):
    idx = list(s.index); v = s.values; n = len(v)
    sig = np.zeros(n, bool)
    I = np.array(idx, dtype='datetime64[D]')
    for i in range(n):
        if i >= 250 and v[i] > np.percentile(v[:i], 90):
            sig[i] = True
        t = np.datetime64(idx[i] - timedelta(days=91))
        j = np.searchsorted(I, t, side='right') - 1
        if j >= 0 and (idx[i] - idx[j]).days <= 122 and v[j] > 0 and v[i] / v[j] - 1 < -0.40:
            sig[i] = True
    return sig, idx[min(250, n - 1)]


sc, fc = extreme(crack)
sw, fw = extreme(wti)
start = max(fc, fw)
lastok = spx.index[-1] - timedelta(days=365)


def eps(idx, sig):
    out = []; ls = None
    for d, s in zip(idx, sig):
        if not s or d < start or d > lastok or is_open(d):
            continue
        if ls is not None and (d - ls).days <= 365:
            continue
        ls = d; out.append((d, hit(d)))
    return out


def summ(e):
    return {h: [sum(1 for d, x in e if (h == 'tutto' or half(d) == h) and x), sum(1 for d, x in e if h == 'tutto' or half(d) == h)] for h in ('tutto', '1986-2005', '2006-oggi')}


V['c2_crack'] = summ(eps(list(crack.index), sc))
V['c2_wti'] = summ(eps(list(wti.index), sw))
base = {h: [0, 0] for h in ('tutto', '1986-2005', '2006-oggi')}
for d in spx.index:
    if d < start or d > lastok or is_open(d):
        continue
    x = hit(d)
    for h in ('tutto', half(d)):
        base[h][1] += 1; base[h][0] += int(x)
V['c2_base'] = base

# ---------------------------------------------------------------- criterio 3
def panel(num, den, skip=None, frm=None):
    rows = []
    ds = [d for d in cd if d in num and d in den and (frm is None or d >= frm)]
    y = np.log(np.array([num[d] / den[d] for d in ds])); w = np.array([W[d] for d in ds]); c = np.array([crack[d] for d in ds])
    for i in range(len(ds)):
        j = lag(ds, i)
        if j < 0 or half(ds[i]) != half(ds[j]):
            continue
        if skip and ds[j] < skip <= ds[i]:
            continue
        rows.append((ds[i], y[i] - y[j], math.log(w[i] / w[j]), (c[i] - c[j]) / w[j]))
    return rows


def oos(rows):
    out = {}
    H = {h: [r for r in rows if half(r[0]) == h] for h in ('1986-2005', '2006-oggi')}
    for tr, te in (('1986-2005', '2006-oggi'), ('2006-oggi', '1986-2005')):
        A, B = np.array([r[1:] for r in H[tr]]), np.array([r[1:] for r in H[te]])
        def fit(cols):
            XA = np.column_stack([np.ones(len(A))] + [A[:, k] for k in cols]); b = np.linalg.lstsq(XA, A[:, 0], rcond=None)[0]
            XB = np.column_stack([np.ones(len(B))] + [B[:, k] for k in cols]); e = B[:, 0] - XB @ b
            return 1 - (e ** 2).sum() / ((B[:, 0] - B[:, 0].mean()) ** 2).sum()
        out[f'{tr}→{te}'] = round(fit([1, 2]) - fit([1]), 4)
    return out


XLE, SPY, VLOc, VLOa, GSPC = yahoo('XLE', True), yahoo('SPY', True), yahoo('VLO'), yahoo('VLO', True), yahoo('^GSPC')
V['c3_XLE_SPY'] = oos(panel(XLE, SPY))
V['c3_VLO_GSPC'] = oos(panel(VLOc, GSPC))
V['c3_VLO_GSPC_senza_scissione'] = oos(panel(VLOc, GSPC, skip=date(1997, 8, 1)))
V['c3_VLO_GSPC_dal_1997_08'] = oos(panel(VLOc, GSPC, frm=date(1997, 8, 1)))

# ---------------------------------------------------------------- oggi
last = crack.iloc[-1]; ld = crack.index[-1]
w12 = crack[[d > ld - timedelta(days=365) for d in crack.index]]
V['oggi'] = {'data': ld.isoformat(), 'crack': round(last, 2), 'percentile': round(100 * ((crack < last).sum() + 0.5 * (crack == last).sum()) / len(crack), 1),
             'max12': [w12.idxmax().isoformat(), round(w12.max(), 2)], 'dist_pct': round((last / w12.max() - 1) * 100, 1)}

# ---------------------------------------------------------------- confronto
R = json.load(open(os.path.join(OUT, 'risultati.json')))
diff = []
NCHK = [0]
def chk(name, a, b, tol=0):
    NCHK[0] += 1
    ok = (a == b) if tol == 0 else (a is not None and b is not None and abs(a - b) <= tol)
    if not ok:
        diff.append(f'{name}: js {a} py {b}')
for X in (20, 30):
    for h in ('tutto', '1986-2005', '2006-oggi'):
        j = R['criterio1'][f'X{X}'][h]
        chk(f'c1 X{X} {h} prima', j['prima'], V[f'c1_X{X}'][h]['prima']); chk(f'c1 X{X} {h} casi', j['casi'], V[f'c1_X{X}'][h]['casi'])
        chk(f'c1 X{X} {h} p', j['p'], V[f'c1_X{X}'][h]['p'], tol=0.03)
    chk(f'c1 X{X} massimi', [R['criterio1'][f'X{X}']['massimi_wti'], R['criterio1'][f'X{X}']['massimi_crack']], V[f'c1_X{X}']['massimi'])
for h in ('tutto', '1986-2005', '2006-oggi'):
    for k in ('crack', 'wti'):
        chk(f'c2 {k} {h}', [R['criterio2'][k][h]['seguiti'], R['criterio2'][k][h]['episodi']], V[f'c2_{k}'][h])
    chk(f'c2 base {h}', [R['criterio2']['base'][h]['seguite'], R['criterio2']['base'][h]['sedute']], V['c2_base'][h])
c3 = {**R['criterio3']['obiettivi'], **R['criterio3']['correzione_dati']['obiettivi'], **R['criterio3']['controlli']}
for k in ('XLE_SPY', 'VLO_GSPC', 'VLO_GSPC_senza_scissione', 'VLO_GSPC_dal_1997_08'):
    for dirn, v in V[f'c3_{k}'].items():
        chk(f'c3 {k} {dirn}', c3[k]['fuori_campione'][dirn]['aumento'], v, tol=0.0002)
o = R['oggi']
chk('oggi data', o['data'], V['oggi']['data']); chk('oggi crack', o['crack'], V['oggi']['crack'], 0.006); chk('oggi percentile', o['percentile_storia'], V['oggi']['percentile'], 0.051)
chk('oggi max12', o['massimo_12_mesi'][1], V['oggi']['max12'][1], 0.006); chk('oggi dist', o['distanza_dal_massimo_12m_pct'], V['oggi']['dist_pct'], 0.051)
V['confronti'] = NCHK[0]
V['differenze'] = diff
json.dump(V, open(os.path.join(OUT, 'verifica.json'), 'w'), indent=1, ensure_ascii=False, default=str)
print(json.dumps(V, indent=0, ensure_ascii=False, default=str)[:3000])
print('CONFRONTI', NCHK[0], 'DIFFERENZE', len(diff), diff)

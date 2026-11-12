"""Ricalcolo indipendente dei numeri chiave di ../risultati.json (ricerca «credito: la soglia dei 350 pb»).

Non importa js/vix.js né backtest.mjs: decodifica da sé data/vix.json (date in base 36, differenze intere / ps), rifà il
calo di HYG/IEF dal massimo di 252 osservazioni e il suo percentile sulla storia fino a quel giorno, i segnali (prima
condizione vera dopo 63 osservazioni valide con la condizione falsa), gli esiti dalla seduta dopo, gli eventi a zigzag e i
criteri (a) e (b), le crisi e la mappa HY ↔ HYG/IEF. Poi confronta con risultati.json e scrive ../verifica.json.

Uso: python3 -I ricerca/credito-soglia/script/verifica.py
"""
import datetime as dt
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
RES = json.load(open(os.path.join(HERE, '..', 'risultati.json')))
VJ = json.load(open(os.path.join(ROOT, 'data', 'vix.json')))


def decode(s):
    d = dt.date.fromisoformat(s['d0'])
    ds = [d]
    for ch in s['gaps']:
        d = d + dt.timedelta(days=int(ch, 36))
        ds.append(d)
    ps = s.get('ps', 1)
    vals, prev = [], None
    for x in s['cd']:
        if x is None:
            vals.append(None); prev = None; continue
        prev = x if prev is None else prev + x
        vals.append(prev / ps)
    return [x.isoformat() for x in ds], vals


sd, sv = decode(VJ['series']['SPX'])
vd, vv = decode(VJ['series']['VIX'])
cd_, cv = decode(VJ['series']['HYGIEF'])
dates = sd
N = len(dates)
close = np.array(sv, dtype=float)
vmap = dict(zip(vd, vv))
vix = [vmap.get(d) for d in dates]
cmap = dict(zip(cd_, cv))
cr = [cmap.get(d) for d in dates]
hmap = {}
for line in open(os.path.join(HERE, '..', 'cache', 'hy_oas.csv')).read().strip().split('\n')[1:]:
    d, v = line.split(',')
    if v.strip():
        hmap[d] = int(round(float(v) * 100))
hy = [hmap.get(d) for d in dates]


def valid_idx(a):
    return [i for i, x in enumerate(a) if x is not None]


def dd_from_max(a, w=252):
    out = [None] * len(a)
    pos = valid_idx(a)
    for j in range(w - 1, len(pos)):
        win = [a[pos[k]] for k in range(j - w + 1, j + 1)]
        out[pos[j]] = (a[pos[j]] / max(win) - 1) * 100
    return out


def above_min(a, w=252):
    out = [None] * len(a)
    pos = valid_idx(a)
    for j in range(w - 1, len(pos)):
        out[pos[j]] = a[pos[j]] - min(a[pos[k]] for k in range(j - w + 1, j + 1))
    return out


def change(a, n):
    out = [None] * len(a)
    pos = valid_idx(a)
    for j in range(n, len(pos)):
        out[pos[j]] = a[pos[j]] - a[pos[j - n]]
    return out


def pct_change(a, n):
    out = [None] * len(a)
    pos = valid_idx(a)
    for j in range(n, len(pos)):
        out[pos[j]] = (a[pos[j]] / a[pos[j - n]] - 1) * 100
    return out


def expanding_pct(a, min_n=252):
    out = [None] * len(a)
    seen = []
    import bisect
    for i, x in enumerate(a):
        if x is None:
            continue
        bisect.insort(seen, x)
        if len(seen) >= min_n:
            out[i] = 100 * bisect.bisect_right(seen, x) / len(seen)
    return out


dd = dd_from_max(cr)
ddpct = expanding_pct([None if x is None else -x for x in dd])
hypct = expanding_pct(hy)
ch21 = pct_change(cr, 21)

rules = {}
for L in (300, 350, 400, 500):
    rules[f'hy_L{L}'] = ('hy', [None if x is None else x >= L for x in hy])
for n in (21, 63):
    c = change(hy, n)
    for X in (50, 100, 150):
        rules[f'hy_up{X}_{n}'] = ('hy', [None if x is None else x >= X for x in c])
am = above_min(hy)
for X in (100, 150, 200):
    rules[f'hy_min{X}'] = ('hy', [None if x is None else x >= X for x in am])
for P in (80, 90):
    rules[f'hy_pct{P}'] = ('hy', [None if x is None else x >= P for x in hypct])
for X in (3, 4, 5, 6, 8, 10):
    rules[f'cr_dd{X}'] = ('cr', [None if x is None else x <= -X for x in dd])
for P in (80, 90, 95):
    rules[f'cr_pct{P}'] = ('cr', [None if x is None else x >= P for x in ddpct])


def signals(c, Q=63):
    pos = valid_idx(c)
    out = []
    for j in range(Q, len(pos)):
        if c[pos[j]] and not any(c[pos[k]] for k in range(j - Q, j)):
            out.append(pos[j])
    return out


def first_possible(c, Q=63):
    pos = valid_idx(c)
    return pos[Q]


def fwd_min_dd(p, h):
    e = p + 1
    if e + h >= N:
        return None
    return min(0.0, (close[e + 1:e + h + 1].min() / close[e] - 1) * 100)


def zigzag(th):
    ev, up, hi, lo = [], True, 0, 0
    for t in range(1, N):
        if up:
            if close[t] > close[hi]:
                hi = t
            elif close[t] <= close[hi] * (1 - th):
                up, lo = False, t
        else:
            if close[t] < close[lo]:
                lo = t
            elif close[t] >= close[lo] * (1 + th):
                ev.append((hi, lo)); up, hi = True, t
    if not up:
        ev.append((hi, lo))
    return ev


EV10, EV20 = zigzag(0.10), zigzag(0.20)


def frac_for(ev, sig):
    out = []
    S = set(sig)
    for pk, tr in ev:
        s = next((i for i in range(max(0, pk - 126), tr) if i in S), None)
        if s is None:
            out.append(1.0); continue
        e = s + 1
        f = 0.0 if e <= pk else max(0.0, min(1.0, (close[pk] - close[e]) / (close[pk] - close[tr])))
        out.append(f)
    return out


def q50(a):
    return float(np.quantile(np.array(a, dtype=float), 0.5)) if len(a) else None


def idx_of(d):
    return next(i for i, x in enumerate(dates) if x >= d)


mine = {}
for rid, (fam, c) in rules.items():
    sig = signals(c)
    fr = first_possible(c)
    base = list(range(fr, N - 1))
    s126 = [fwd_min_dd(p, 126) for p in sig]
    s126 = [x for x in s126 if x is not None]
    b126 = [fwd_min_dd(p, 126) for p in base]
    b126 = [x for x in b126 if x is not None]
    q = 100 * sum(x <= -10 for x in s126) / len(s126) if s126 else None
    bq = 100 * sum(x <= -10 for x in b126) / len(b126)
    evs10 = [(pk, tr) for pk, tr in EV10 if pk >= fr or tr >= fr]
    evs20 = [(pk, tr) for pk, tr in EV20 if pk >= fr or tr >= fr]
    nal = sum(1 for p in base if c[p]); nval = sum(1 for p in base if c[p] is not None)
    subs = []
    SUB = [('1990-01-01', '2009-12-31'), ('2010-01-01', '2099-12-31')] if fam == 'hy' else [('1990-01-01', '2016-12-31'), ('2017-01-01', '2099-12-31')]
    for a, b in SUB:
        i0 = max(fr, idx_of(a))
        i1 = N - 1 if b > dates[-1] else idx_of(b) - 1
        ps = [p for p in sig if i0 <= p <= i1]
        v = [fwd_min_dd(p, 126) for p in ps]; v = [x for x in v if x is not None]
        bb = [fwd_min_dd(p, 126) for p in range(i0, min(i1, N - 2) + 1)]; bb = [x for x in bb if x is not None]
        subs.append({'n126': len(v), 'k10': sum(x <= -10 for x in v), 'diff': None if not v else round(100 * sum(x <= -10 for x in v) / len(v) - 100 * sum(x <= -10 for x in bb) / len(bb), 1)})
    mine[rid] = {
        'signals': [dates[p] for p in sig], 'from': dates[fr],
        'a_k': sum(x <= -10 for x in s126), 'a_n': len(s126), 'a_q': None if q is None else round(q, 1), 'base_q': round(bq, 1),
        'a_diff': None if q is None else round(q - bq, 1), 'alarm': round(100 * nal / nval, 1),
        'ev10_n': len(evs10), 'ev20_n': len(evs20),
        'ev10_med': round(q50(frac_for(evs10, sig)), 3), 'ev20_med': round(q50(frac_for(evs20, sig)), 3),
        'ev10_warned': sum(1 for f, (pk, tr) in zip(frac_for(evs10, sig), evs10) if any(pk - 126 <= s < tr for s in sig)),
        'sub': subs,
    }

# confronto
checks, diffs = 0, []


def cmp(name, a, b, tol=0.051):
    global checks
    checks += 1
    ok = (a is None and b is None) or (a is not None and b is not None and (a == b if isinstance(a, (str, list)) else abs(a - b) <= tol))
    if not ok:
        diffs.append({'controllo': name, 'python': a, 'node': b})


for rid, m in mine.items():
    r = RES['regole'][rid]
    cmp(rid + ' segnali', m['signals'], [x['date'] for x in r['list']])
    cmp(rid + ' inizio', m['from'], r['from'])
    cmp(rid + ' (a) k', m['a_k'], r['a']['k']); cmp(rid + ' (a) n', m['a_n'], r['a']['n'])
    cmp(rid + ' (a) quota', m['a_q'], r['a']['q']); cmp(rid + ' base', m['base_q'], r['a']['base']); cmp(rid + ' (a) diff', m['a_diff'], r['a']['diff'], 0.11)
    cmp(rid + ' sedute in allarme %', m['alarm'], r['alarmShare'])
    cmp(rid + ' eventi10 n', m['ev10_n'], r['b']['ev10']['n']); cmp(rid + ' eventi20 n', m['ev20_n'], r['b']['ev20']['n'])
    cmp(rid + ' (b) mediana 10', m['ev10_med'], r['b']['ev10']['medFrac'], 0.0011); cmp(rid + ' (b) mediana 20', m['ev20_med'], r['b']['ev20']['medFrac'], 0.0011)
    cmp(rid + ' eventi10 avvisati', m['ev10_warned'], r['b']['ev10']['warned'])
    for k, s in enumerate(m['sub']):
        cmp(f'{rid} sottoperiodo {k} n', s['n126'], r['sub'][k]['n126']); cmp(f'{rid} sottoperiodo {k} k', s['k10'], r['sub'][k]['k10']); cmp(f'{rid} sottoperiodo {k} diff', s['diff'], r['sub'][k]['diff'], 0.11)

cmp('eventi ≥10% dal 1997', [f'{dates[a]}>{dates[b]}' for a, b in EV10 if dates[a] >= '1997-01-01'], [f"{e['peak']}>{e['trough']}" for e in RES['eventi10']])
cmp('eventi ≥20% dal 1997', [f'{dates[a]}>{dates[b]}' for a, b in EV20 if dates[a] >= '1997-01-01'], [f"{e['peak']}>{e['trough']}" for e in RES['eventi20']])

# esiti dei segnali dei 350 pb (rendimenti e cali)
r350 = RES['regole']['hy_L350']['list']
for row in r350:
    p = dates.index(row['date']); e = p + 1
    for h in (21, 63, 126, 252):
        v = None if e + h >= N else round((close[e + h] / close[e] - 1) * 100, 1)
        cmp(f"350 {row['date']} r{h}", v, row[f'r{h}'], 0.051)
    for h in (63, 126, 252):
        v = fwd_min_dd(p, h)
        cmp(f"350 {row['date']} dd{h}", None if v is None else round(v, 1), row[f'dd{h}'], 0.051)
    vm = [x for x in vix[e:e + 127] if x is not None] if e + 126 < N else None
    cmp(f"350 {row['date']} VIX max", None if not vm else round(max(vm), 1), row['vixMax126'], 0.051)
    mx = close[max(0, p - 251):p + 1].max()
    cmp(f"350 {row['date']} S&P dal massimo", round((close[p] / mx - 1) * 100, 1), row['spxDD'], 0.051)

# crisi: segnale e quota già avvenuta per le regole principali
for c in RES['crisi']:
    if not c.get('peak'):
        continue
    pk, tr = dates.index(c['peak']), dates.index(c['trough'])
    for rid in ('hy_L300', 'hy_L350', 'hy_L400', 'hy_L500', 'cr_dd3', 'cr_dd4', 'cr_dd5', 'cr_dd8'):
        v = c.get(rid)
        if not v or 'dati' in v:
            continue
        sig = signals(rules[rid][1])
        s = next((i for i in sig if pk - 126 <= i < tr), None)
        cmp(f"crisi {c['name']} {rid} segnale", None if s is None else dates[s], v.get('signal'))
        if s is not None:
            e = s + 1
            f = 0.0 if e <= pk else max(0.0, min(1.0, (close[pk] - close[e]) / (close[pk] - close[tr])))
            cmp(f"crisi {c['name']} {rid} quota", round(f, 3), v['frac'], 0.0011)

# mappa HY ↔ HYG/IEF
def corr(a, b):
    xs = [(x, y) for x, y in zip(a, b) if x is not None and y is not None]
    return round(float(np.corrcoef([x for x, _ in xs], [y for _, y in xs])[0, 1]), 3), len(xs)


r, n = corr(hy, dd); cmp('correlazione livello HY / calo HYG-IEF', r, RES['mapping']['corr_livello_HY_vs_calo_HYGIEF']['r'], 0.0011)
r, n = corr(am, dd); cmp('correlazione HY sopra il minimo / calo', r, RES['mapping']['corr_HY_sopra_minimo252_vs_calo_HYGIEF']['r'], 0.0011)
r, n = corr(change(hy, 21), ch21); cmp('correlazione variazioni a 21', r, RES['mapping']['corr_variazione21_HY_vs_HYGIEF21']['r'], 0.0011)
for L in (300, 350, 400, 500):
    cr_ = [dd[i] for i in range(1, N) if hy[i] is not None and hy[i - 1] is not None and hy[i] >= L and hy[i - 1] < L and dd[i] is not None]
    cmp(f'{L} attraversamenti dal basso con HYG/IEF', len(cr_), RES['mapping']['soglie'][str(L)]['attraversamenti'])
    cmp(f'{L} calo mediano agli attraversamenti', round(q50(cr_), 2), RES['mapping']['soglie'][str(L)]['calo_HYGIEF_agli_attraversamenti_mediana'], 0.0051)
    com = [i for i in range(N) if hy[i] is not None and dd[i] is not None]
    cmp(f'{L} quota di sedute sopra (periodo comune)', round(100 * sum(hy[i] >= L for i in com) / len(com), 1), RES['mapping']['soglie'][str(L)]['quota_sedute_sopra_nel_periodo_comune'])

out = {'controlli': checks, 'differenze': len(diffs), 'elenco': diffs}
json.dump(out, open(os.path.join(HERE, '..', 'verifica.json'), 'w'), ensure_ascii=False, indent=1)
print(f'{checks} controlli, {len(diffs)} differenze')
for d in diffs[:40]:
    print(d)

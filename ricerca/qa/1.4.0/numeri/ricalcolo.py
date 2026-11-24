#!/usr/bin/env python3
"""Controllo numeri 1.4.0 · ricalcolo indipendente della vista 8 «Emergenti» (Python, solo libreria standard).

Non importa nulla dell'app: decodifica da sé i file data/*.json e riscrive le definizioni scritte in testa a js/emerging.js
(pulizia dei cambi, z, F, D, indice in dollari, variazione a 63 sedute) e la formula «Nuova» della rotazione (rrgNew di
js/engine.js, riscritta). Scrive calc.json (valori attesi) e probe_dates.json (date da provare nel riquadro del grafico).

Uso: python3 -I ricerca/qa/1.4.0/numeri/ricalcolo.py <cartella del sito>
"""
import json, math, sys, os, datetime as dt

SITE = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
R = lambda f: json.load(open(os.path.join(SITE, f)))
EMG, CFGE = R('data/emerging.json'), R('config/emerging.json')
IX = {**R('data/indices_more.json')['series'], **R('data/indices.json')['series']}
KEYS = CFGE['order']

def ddate(s): return dt.date.fromisoformat(s)

def dec_dates(d0, gaps):
    out, t = [d0], ddate(d0)
    for ch in gaps:
        t = t + dt.timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out

def dec_vals(cd, ps):
    out, p = [], None
    for r in cd:
        if r is None: p = None; out.append(None); continue
        p = r if p is None else p + r
        out.append(p / ps)
    return out

def series(sym):
    x = EMG['series'][sym]
    d, v = dec_dates(x['d0'], x['gaps']), dec_vals(x['cd'], x.get('ps') or 1)
    assert len(d) == len(v), sym
    assert d[-1] == x['last'], (sym, d[-1], x['last'])
    return d, v

def rle(a, n):
    out = [None] * n
    for k, (i0, v) in enumerate(a):
        i1 = a[k + 1][0] if k + 1 < len(a) else n
        for i in range(i0, min(i1, n)): out[i] = v
    return out

def index(k):
    x = IX[k]
    d = dec_dates(x['d0'], x['gaps'])
    close = dec_vals(x['cd'], x.get('ps') or 100)
    a200 = dec_vals(x['d200'], 1)
    n = rle(x['n'], len(a200))
    p200 = [None] * len(d)
    for i, a in enumerate(a200):
        j = x['b0'] + i
        if j < len(d) and a is not None and n[i]: p200[j] = 100 * a / n[i]
    return d, close, p200

def gaps_break(dates):
    b, out = 0, [0]
    for i in range(1, len(dates)):
        if (ddate(dates[i]) - ddate(dates[i - 1])).days > 10: b += 1
        out.append(b)
    return out

def clean(sym, d, v):
    tight = 'CNY' in sym or 'HKD' in sym
    thr, back = (0.01, 0.003) if tight else (0.03, 0.01)
    bad = set()
    for i in range(1, len(v) - 1):
        r1, r2 = math.log(v[i] / v[i - 1]), math.log(v[i + 1] / v[i])
        if abs(r1) > thr and abs(r2) > thr and (r1 > 0) != (r2 > 0) and abs(r1 + r2) < back: bad.add(i)
    dd = [x for i, x in enumerate(d) if i not in bad]; vv = [x for i, x in enumerate(v) if i not in bad]
    return dd, vv, [(d[i], v[i], v[i - 1], v[i + 1]) for i in sorted(bad)]

def fx_signals(d, v, w=63, zt=1.0, look=126, sdN=756, back=0.5):
    n, brk = len(v), gaps_break(d)
    ok = lambda i, k: i - k >= 0 and brk[i] == brk[i - k]
    lr = [math.log(v[i] / v[i - w]) if ok(i, w) else None for i in range(n)]
    sd, z, F = [None] * n, [None] * n, [None] * n
    for i in range(n):
        lo = max(0, i - sdN + 1)
        win = [x for x in lr[lo:i + 1] if x is not None]
        if len(win) >= 0.9 * sdN and (ddate(d[i]) - ddate(d[lo])).days <= 1278:
            m = sum(win) / len(win)
            sd[i] = math.sqrt(sum((x - m) ** 2 for x in win) / (len(win) - 1))
        if sd[i] and lr[i] is not None: z[i] = lr[i] / sd[i]
    for i in range(n):
        if sd[i] is None or i - look + 1 < 0 or not ok(i, w - 1): continue
        zs = [x for x in z[i - look + 1:i + 1] if x is not None]
        if len(zs) < 0.9 * look: continue
        mx = max(v[i - w + 1:i + 1])
        F[i] = 1 if (any(x >= zt for x in zs) and math.log(mx / v[i]) >= back * sd[i]) else 0
    return z, F, sd

def state(F, z):
    if F is None or z is None: return None
    return 'ferma' if F else ('calo' if z >= 1 else 'normale')

def dollar(d, v, ma=200, w=63):
    n, brk = len(v), gaps_break(d)
    ok = lambda i, k: i - k >= 0 and brk[i] == brk[i - k]
    sma, D, ch = [None] * n, [None] * n, [None] * n
    for i in range(n):
        if ok(i, w): ch[i] = (v[i] / v[i - w] - 1) * 100
        if ok(i, ma - 1): sma[i] = sum(v[i - ma + 1:i + 1]) / ma
        if ok(i, max(ma - 1, w)): D[i] = 1 if (v[i] < sma[i] and v[i] < v[i - w]) else 0
    return sma, D, ch

# ---------- rotazione: formula «Nuova» riscritta da js/engine.js ----------
def ema(a, n):
    k, out, p = 2 / (n + 1), [None] * len(a), None
    for i, x in enumerate(a):
        if x is None: continue
        p = x if p is None else p + k * (x - p); out[i] = p
    return out

def rrg_new(s, b, short=10, long=30, mom=8, half=26, scale=2.5):
    n = len(s)
    lr = [math.log(s[i] / b[i]) if s[i] is not None and b[i] else None for i in range(n)]
    first = next((i for i, x in enumerate(lr) if x is not None), -1)
    lam = 0.5 ** (1 / half)
    sig, v2, cnt = [None] * n, None, 0
    for i in range(1, n):
        if lr[i] is None or lr[i - 1] is None: continue
        r = lr[i] - lr[i - 1]
        v2 = r * r if v2 is None else lam * v2 + (1 - lam) * r * r
        cnt += 1
        if cnt >= half: sig[i] = math.sqrt(v2)
    es, el, kk = ema(lr, short), ema(lr, long), math.sqrt((long - short) / 2)
    X = [None if (lr[i] is None or first < 0 or i < first + long or not sig[i]) else (es[i] - el[i]) / (sig[i] * kk) for i in range(n)]
    eX = ema(X, mom)
    ratio = [None if x is None else 100 + scale * x for x in X]
    momv = [None if (X[i] is None or eX[i] is None) else 100 + scale * math.sqrt(mom) * (X[i] - eX[i]) for i in range(n)]
    return ratio, momv

def quad(x, y):
    if x >= 100: return 'Leading' if y >= 100 else 'Weakening'
    return 'Improving' if y >= 100 else 'Lagging'

def weekly_last(dates):
    # ultima seduta di ogni settimana lunedì-domenica
    out = {}
    for i, d in enumerate(dates):
        y, wk, _ = ddate(d).isocalendar(); out[(y, wk)] = i
    return sorted(out.values())

def rel_strength(etf, bench):
    ed, ev = series(etf); bd, bv = series(bench)
    bm = dict(zip(bd, bv))
    dates, a, b = [], [], []
    for d, x in zip(ed, ev):
        if d in bm and x is not None and bm[d] is not None: dates.append(d); a.append(x); b.append(bm[d])
    wi = weekly_last(dates)
    ratio, momv = rrg_new([a[i] for i in wi], [b[i] for i in wi])
    L = len(wi) - 1
    trail = [(ratio[q], momv[q], dates[wi[q]]) for q in range(max(0, L - 9), L + 1) if ratio[q] is not None and momv[q] is not None]
    return {'last': dates[wi[L]], 'ratio': ratio[L], 'mom': momv[L], 'quad': None if ratio[L] is None else quad(ratio[L], momv[L]), 'trail': trail}

def change(a, h):
    t = len(a) - 1
    while t >= 0 and a[t] is None: t -= 1
    return ((a[t] / a[t - h] - 1) * 100, t) if t - h >= 0 and a[t] is not None and a[t - h] is not None else (None, t)

out, probe = {'fx': {}, 'idx': {}, 'rs': {}}, {}
dd, dv = series(CFGE['fred'])
sma, D, ch = dollar(dd, dv)
j = len(dv) - 1
out['dollar'] = {'date': dd[j], 'val': dv[j], 'sma': sma[j], 'ch': ch[j], 'D': D[j], 'n': len(dv)}
DMAP = {d: (dv[i], D[i], sma[i]) for i, d in enumerate(dd)}
FX = {}
for k in KEYS:
    c = CFGE['indices'][k]
    if c['fx']:
        d0, v0 = series(c['fx'])
        cd, cv, removed = clean(c['fx'], d0, v0)
        z, F, sd = fx_signals(cd, cv)
        FX[k] = (cd, cv, z, F, sd)
        jj = len(cv) - 1
        out['fx'][k] = {'sym': c['fx'], 'date': cd[jj], 'val': cv[jj], 'z': z[jj], 'F': F[jj], 'sd': sd[jj], 'state': state(F[jj], z[jj]),
                        'removed': removed, 'nrows': len(v0),
                        # storia degli stati, per il confronto con la fonte FRED e per la prova «nessun dato futuro»
                        'states_last250': [(cd[i], state(F[i], z[i]), z[i]) for i in range(len(cd) - 250, len(cd))]}
    rs = rel_strength(c['etf'], CFGE['benchmark'])
    out['rs'][k] = rs
    d, close, p200 = index(k)
    now = len(p200) - 1
    while now > 0 and p200[now] is None: now -= 1
    last = len(close) - 1
    ch63, t63 = change(close, 63)
    usd = None
    if c['fx'] is None: usd = close
    elif k in FX:
        m = dict(zip(FX[k][0], FX[k][1]))
        usd = [close[i] / m[x] if close[i] is not None and x in m and m[x] > 0 else None for i, x in enumerate(d)]
    ch63u, tu = change(usd, 63) if usd else (None, None)
    out['idx'][k] = {'last': d[last], 'now': d[now], 'breadth': p200[now], 'close': close[last], 'ch63': ch63, 'ch63_from': d[t63 - 63], 'ch63_to': d[t63],
                     'ch63u': ch63u, 'ch63u_from': d[tu - 63] if tu is not None and ch63u is not None else None, 'ch63u_to': d[tu] if tu is not None else None,
                     'idx_dates_without_fx_last400': [x for x in d[-400:] if k in FX and x not in dict.fromkeys(FX[k][0])]}
    # date da provare nel riquadro: ultima, 63 sedute fa, una con il cambio tolto, una senza FRED, una senza cambio, una «ferma» e una «calo»
    fxset = set(FX[k][0]) if k in FX else set()
    cand = [d[last], d[last - 63], d[last - 300]]
    win3 = [x for x in d if x >= (ddate(d[last]) - dt.timedelta(days=int(3 * 365.25))).isoformat()]
    if k in FX:
        for (rd, *_ ) in out['fx'][k]['removed']:
            if rd in d: cand.append(rd)
        nofx = [x for x in win3 if x not in fxset]
        cand += nofx[-2:]
        st = {cd_: state(F_, z_) for cd_, z_, F_ in zip(FX[k][0], FX[k][2], FX[k][3])}
        fe = [x for x in win3 if st.get(x) == 'ferma']; ca = [x for x in win3 if st.get(x) == 'calo']
        cand += fe[-1:] + ca[-1:] + fe[:1]
    nofred = [x for x in win3 if x not in DMAP]
    cand += nofred[-2:]
    probe[k] = sorted(set(cand))
    # valori attesi del riquadro per le date provate
    exp = {}
    i_of = {x: i for i, x in enumerate(d)}
    for x in probe[k]:
        i = i_of[x]
        e = {'close': close[i], 'p200': p200[i], 'usd': usd[i] if usd else None}
        if k in FX:
            fi = {cd_: n_ for n_, cd_ in enumerate(FX[k][0])}.get(x)
            e['fx'] = None if fi is None else FX[k][1][fi]
            e['fxstate'] = None if fi is None else state(FX[k][3][fi], FX[k][2][fi])
        e['dl'] = DMAP[x][0] if x in DMAP else None
        exp[x] = e
    out['idx'][k]['probe'] = exp
    out['idx'][k]['usd_series_first_3A'] = None
    # base 100 dell'indice in dollari: primo valore nel periodo (3A e MAX)
    t1 = ddate(d[last])
    for rng, yrs in (('3A', 3), ('MAX', None)):
        T0 = dt.datetime.combine(t1, dt.time()) - dt.timedelta(days=yrs * 365.25) if yrs else dt.datetime.fromisoformat(d[0])
        i0 = next(i for i, x in enumerate(d) if dt.datetime.fromisoformat(x) >= T0)
        base = next((usd[i] for i in range(i0, len(d)) if usd and usd[i] is not None), None)
        out['idx'][k]['base_' + rng] = {'i0': d[i0], 'base': base}

json.dump(out, open(os.path.join(HERE, 'calc.json'), 'w'), indent=1, default=str)
json.dump(probe, open(os.path.join(HERE, 'probe_dates.json'), 'w'), indent=1)
print('dollaro', out['dollar'])
for k in KEYS:
    f = out['fx'].get(k); i = out['idx'][k]; r = out['rs'][k]
    print(k, 'fx', f and (f['date'], round(f['val'], 4), f['z'] and round(f['z'], 3), f['F'], f['state'], len(f['removed'])),
          '| ch63', i['ch63'] and round(i['ch63'], 2), i['ch63_from'], i['ch63_to'], '| $', i['ch63u'] and round(i['ch63u'], 2), i['ch63u_from'], i['ch63u_to'],
          '| breadth', i['breadth'] and round(i['breadth'], 2), i['now'], i['last'], '| RS', r['last'], round(r['ratio'], 2), round(r['mom'], 2), r['quad'])

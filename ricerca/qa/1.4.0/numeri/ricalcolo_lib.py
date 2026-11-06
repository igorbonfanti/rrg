"""Funzioni del ricalcolo indipendente (vedi ricalcolo.py). Python, solo libreria standard: nessun file dell'app."""
import json, math, os, datetime as dt
EMG = CFGE = IX = None
def init(site):
    global EMG, CFGE, IX
    R = lambda f: json.load(open(os.path.join(site, f)))
    EMG, CFGE = R('data/emerging.json'), R('config/emerging.json')
    IX = {**R('data/indices_more.json')['series'], **R('data/indices.json')['series']}

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


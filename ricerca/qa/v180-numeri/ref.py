# Calcoli indipendenti dai JSON in data/ del repository (nessuna funzione dell'app)
import json, math, datetime as dt, bisect
import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../data/') + '/'
def J(f): return json.load(open(D + f))
def dates_from(d0, gaps):
    out = [d0]; t = dt.date.fromisoformat(d0)
    for ch in gaps:
        t += dt.timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out
def delta(a, scale):
    out, p = [], None
    for r in a:
        if r is None: p = None; out.append(None); continue
        p = r if p is None else p + r; out.append(p / scale)
    return out
def rle(r, n):
    out = [None] * n
    for k, (i0, v) in enumerate(r):
        i1 = r[k + 1][0] if k + 1 < len(r) else n
        for i in range(i0, min(i1, n)): out[i] = v
    return out
def sma200(c):
    out = [None] * len(c)
    for i in range(len(c)):
        if i >= 199 and all(c[k] is not None for k in range(i - 199, i + 1)):
            out[i] = sum(c[i - 199:i + 1]) / 200
    return out
def dd52(c, w=252):
    out = [None] * len(c)
    for i in range(len(c)):
        if c[i] is None: continue
        mx = max(v for v in c[max(0, i - w + 1):i + 1] if v is not None)
        out[i] = (c[i] / mx - 1) * 100
    return out
_sec = None
def sector(s):
    global _sec
    if _sec is None: _sec = (J('sectors.json'), J('breadth.json'))
    S, B = _sec
    dates = S['dates']; c = S['adjclose'][s]
    pos = {d: i for i, d in enumerate(dates)}
    b = B['series'][s]; L = len(B['dates']); n = rle(b['n'], L)
    p200 = [None] * len(dates); p50 = [None] * len(dates)
    for i, d in enumerate(B['dates']):
        j = pos.get(d)
        if j is None or not n[i]: continue
        p200[j] = 100 * b['a200'][i] / n[i]; p50[j] = 100 * b['a50'][i] / n[i]
    return dict(dates=dates, close=c, ma=sma200(c), dd=dd52(c), p200=p200, p50=p50)
_ix = None
def index(k):
    global _ix
    if _ix is None: _ix = {**J('indices.json')['series'], **J('indices_more.json')['series']}
    x = _ix[k]; dates = dates_from(x['d0'], x['gaps']); L = len(dates)
    close = delta(x['cd'], x.get('ps', 100))
    a200 = delta(x['d200'], 1); a50 = delta(x['d50'], 1); m = len(a200); n = rle(x['n'], m)
    p200 = [None] * L; p50 = [None] * L
    for i in range(m):
        j = x['b0'] + i
        if j >= L or a200[i] is None or not n[i]: continue
        p200[j] = 100 * a200[i] / n[i]; p50[j] = 100 * a50[i] / n[i]
    return dict(dates=dates, close=close, ma=sma200(close), dd=dd52(close), p200=p200, p50=p50)
def counts(s):
    out, i = [], 0
    while i < len(s):
        ch = s[i]
        if ch == '-': out.append(None)
        elif ch == 'z': out.append(int(s[i + 1:i + 4], 36)); i += 3
        else: out.append(int(ch, 36))
        i += 1
    return out
def cap(k, thr=7, win=5, mode='count', q=0.99, warm=756):
    x = J('capitulation.json')['series'][k]; dates = dates_from(x['d0'], x['gaps']); L = len(dates)
    n = rle(x['n'], L); c = counts(x['x%d' % thr]); c = c + [None] * (L - len(c))
    s = [None] * L
    for i in range(win - 1, L):
        w = range(i - win + 1, i + 1)
        if all(c[j] is not None and n[j] for j in w):
            s[i] = sum((100 * c[j] / n[j]) if mode == 'pct' else c[j] for j in w)
    al = [None] * L; srt = []
    for i in range(L):
        if len(srt) >= warm:
            pos = q * (len(srt) - 1); lo = math.floor(pos); f = pos - lo
            al[i] = srt[lo] + (f * (srt[lo + 1] - srt[lo]) if lo + 1 < len(srt) else 0)
        if s[i] is not None: bisect.insort_right(srt, s[i])
    return dict(dates=dates, sum=s, alert=al)
def generic(f, k):
    x = J(f)['series'][k]; return dates_from(x['d0'], x['gaps']), delta(x['cd'], x.get('ps', 1))
def fmt(v, d=1):
    # formato italiano dell'app: separatore delle migliaia «.», decimali «,»
    if v is None: return '—'
    s = f'{abs(v):,.{d}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return ('−' if v < 0 and round(abs(v), d) != 0 else '') + s
def pxdec(v): return 2 if v is None else (2 if v >= 10 else 3) if False else None

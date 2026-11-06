"""Ricalcolo indipendente della vista 8 (controllo numeri2, 1.4.0 @249d245).
Solo libreria standard di Python; nessun modulo dell'app. Le formule vengono dalle definizioni scritte
(testa di js/emerging.js, README, config) e sono riscritte da zero qui.
Uso: import lib2; lib2.init(<cartella del sito>)."""
import json, math, os, datetime as dt

SITE = None
EMG = CFG = IX = TH = None


def init(site):
    global SITE, EMG, CFG, IX
    SITE = site
    R = lambda f: json.load(open(os.path.join(site, f)))
    EMG, CFG = R('data/emerging.json'), R('config/emerging.json')
    IX = {}
    IX.update(R('data/indices_more.json')['series'])
    IX.update(R('data/indices.json')['series'])


D0 = dt.date(1970, 1, 1)
def dnum(s): return (dt.date.fromisoformat(s) - D0).days


def dec_dates(d0, gaps):
    t = dt.date.fromisoformat(d0); out = [d0]
    for ch in gaps:
        t += dt.timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out


def dec_vals(cd, ps):
    out, acc = [], None
    for r in cd:
        if r is None:
            acc = None; out.append(None); continue
        acc = r if acc is None else acc + r
        out.append(acc / ps)
    return out


def em(sym):
    x = EMG['series'][sym]
    d, v = dec_dates(x['d0'], x['gaps']), dec_vals(x['cd'], x.get('ps') or 1)
    assert len(d) == len(v) and d[-1] == x['last']
    return {'dates': d, 'val': v, 'fred': x.get('fred')}


def rle(a, n):
    out = [None] * n
    for k, (i0, v) in enumerate(a):
        i1 = a[k + 1][0] if k + 1 < len(a) else n
        for i in range(i0, min(i1, n)): out[i] = v
    return out


def index(k):
    x = IX[k]
    d = dec_dates(x['d0'], x['gaps'])
    if 'cd' in x:
        close = dec_vals(x['cd'], x.get('ps') or 100)
        a200 = dec_vals(x['d200'], 1)
    else:
        close, a200 = x['close'], x['a200']
    L = len(d); m = len(a200)
    n = rle(x['n'], m)
    pct = [None] * L
    for i in range(m):
        j = x['b0'] + i
        if j < L and a200[i] is not None and n[i]:
            pct[j] = 100 * a200[i] / n[i]
    return {'dates': d, 'close': close, 'pct200': pct}


# ---------- cambi ----------
def gaps_id(dates):
    """numero progressivo del tratto senza buchi oltre 10 giorni"""
    g, out = 0, [0]
    for i in range(1, len(dates)):
        if dnum(dates[i]) - dnum(dates[i - 1]) > 10: g += 1
        out.append(g)
    return out


def clean(sym, s):
    """Errori di stampa SOLO nella coda di Yahoo (date > fred): salto > soglia che si annulla il giorno dopo
    entro 'back', oppure salto > 5 soglie che rientra per almeno 3/4. CNY e HKD: 1% e 0,3%; gli altri 3% e 1%."""
    tight = sym.startswith('CNY') or sym.startswith('HKD')
    thr, back = (0.01, 0.003) if tight else (0.03, 0.01)
    d, v, fred = s['dates'], s['val'], s['fred']
    drop = set()
    for i in range(1, len(v) - 1):
        if fred and d[i] <= fred: continue
        a, b = math.log(v[i] / v[i - 1]), math.log(v[i + 1] / v[i])
        if abs(a) <= thr or abs(b) <= thr or (a > 0) == (b > 0): continue
        small = min(abs(a), abs(b))
        if abs(a + b) < back or (small > 5 * thr and abs(a + b) < 0.25 * small): drop.add(i)
    D = [x for i, x in enumerate(d) if i not in drop]
    V = [x for i, x in enumerate(v) if i not in drop]
    return {'dates': D, 'val': V, 'g': gaps_id(D), 'fred': fred, 'removed': [(d[i], v[i]) for i in sorted(drop)]}


def plain(s):
    return {'dates': s['dates'], 'val': s['val'], 'g': gaps_id(s['dates']), 'fred': None, 'removed': []}


def win_ok(S, i, k): return i - k >= 0 and S['g'][i] == S['g'][i - k]


def fx_ind(S, w=63, look=126, N=756):
    v, d = S['val'], S['dates']; n = len(v)
    r = [math.log(v[i] / v[i - w]) if win_ok(S, i, w) else None for i in range(n)]
    sd = [None] * n; z = [None] * n; F = [None] * n
    for i in range(n):
        lo = max(0, i - N + 1)
        xs = [x for x in r[lo:i + 1] if x is not None]
        if len(xs) >= 0.9 * N and dnum(d[i]) - dnum(d[lo]) <= 1278:
            m = sum(xs) / len(xs)
            sd[i] = math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
        if sd[i] and r[i] is not None: z[i] = r[i] / sd[i]
    for i in range(n):
        if sd[i] is None or i - look + 1 < 0 or not win_ok(S, i, w - 1): continue
        zs = [x for x in z[i - look + 1:i + 1] if x is not None]
        if len(zs) < 0.9 * look: continue
        hit = any(x >= 1 for x in zs)
        mx = max(v[i - w + 1:i + 1])
        F[i] = 1 if hit and math.log(mx / v[i]) >= 0.5 * sd[i] else 0
    return {'r': r, 'sd': sd, 'z': z, 'F': F}


def fx_state(F, z):
    if F is None or z is None: return None
    return 'ferma' if F == 1 else ('calo' if z >= 1 else 'normale')


def dollar_ind(S, ma=200, w=63):
    v = S['val']; n = len(v)
    D = [None] * n; sma = [None] * n; ch = [None] * n
    for i in range(n):
        if win_ok(S, i, w): ch[i] = (v[i] / v[i - w] - 1) * 100
        if win_ok(S, i, ma - 1): sma[i] = sum(v[i - ma + 1:i + 1]) / ma
        if win_ok(S, i, max(ma - 1, w)): D[i] = 1 if (v[i] < sma[i] and v[i] < v[i - w]) else 0
    return {'D': D, 'sma': sma, 'ch': ch}


# ---------- forza relativa (formula «Nuova» della vista 2, riscritta) ----------
def ema(a, n):
    k = 2 / (n + 1); out = [None] * len(a); p = None
    for i, x in enumerate(a):
        if x is None: continue
        p = x if p is None else p + k * (x - p); out[i] = p
    return out


def rrg_new(a, b, short=10, long=30, mom=8, hl=26, scale=2.5):
    n = len(a)
    lr = [math.log(a[i] / b[i]) if a[i] is not None and b[i] else None for i in range(n)]
    first = next((i for i, x in enumerate(lr) if x is not None), -1)
    lam = 0.5 ** (1 / hl); sig = [None] * n; v2 = None; c = 0
    for i in range(1, n):
        if lr[i] is None or lr[i - 1] is None: continue
        x = lr[i] - lr[i - 1]
        v2 = x * x if v2 is None else lam * v2 + (1 - lam) * x * x
        c += 1
        if c >= hl: sig[i] = math.sqrt(v2)
    es, el = ema(lr, short), ema(lr, long); kk = math.sqrt((long - short) / 2)
    X = [None if (lr[i] is None or first < 0 or i < first + long or not sig[i]) else (es[i] - el[i]) / (sig[i] * kk) for i in range(n)]
    eX = ema(X, mom)
    ratio = [None if x is None else 100 + scale * x for x in X]
    momv = [None if (X[i] is None or eX[i] is None) else 100 + scale * math.sqrt(mom) * (X[i] - eX[i]) for i in range(n)]
    return ratio, momv


def quad(x, y):
    if x >= 100: return 'Leading' if y >= 100 else 'Weakening'
    return 'Improving' if y >= 100 else 'Lagging'


def weekly_last(dates):
    """ultima seduta di ogni settimana (settimana lunedì-domenica)"""
    out = {}
    for i, d in enumerate(dates):
        wd = dt.date.fromisoformat(d)
        key = (wd - dt.timedelta(days=wd.weekday())).isoformat()
        out[key] = i
    return [out[k] for k in sorted(out)]


def rel_strength(etf, bench, upto=None):
    bm = dict(zip(bench['dates'], bench['val']))
    D, A, B = [], [], []
    for d, x in zip(etf['dates'], etf['val']):
        if upto and d > upto: break
        if d in bm and x is not None and bm[d] is not None:
            D.append(d); A.append(x); B.append(bm[d])
    if len(D) < 60: return None
    wi = weekly_last(D)
    ra, mo = rel_ratio = rrg_new([A[i] for i in wi], [B[i] for i in wi])
    L = len(wi) - 1
    trail = [(ra[q], mo[q], D[wi[q]]) for q in range(max(0, L - 9), L + 1) if ra[q] is not None and mo[q] is not None]
    return {'last': D[wi[L]], 'ratio': ra[L], 'mom': mo[L], 'quad': None if ra[L] is None or mo[L] is None else quad(ra[L], mo[L]), 'trail': trail}


# ---------- formattazione all'italiana ----------
def tofixed(x, d):
    """come Number.prototype.toFixed di JavaScript: valore binario esatto, a metà si arrotonda verso l'alto"""
    from decimal import Decimal, ROUND_HALF_UP
    return str(Decimal(x).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP))


def fmt(v, d=1):
    if v is None or (isinstance(v, float) and math.isnan(v)): return '—'
    s = tofixed(abs(v), d)
    neg = v < 0 and float(s) != 0
    return ('−' if neg else '') + s.replace('.', ',')


def sgnp(v, d=1):
    if v is None: return '—'
    s = tofixed(abs(v), d)
    z = float(s) == 0
    return ('' if z else ('+' if v > 0 else '−')) + s.replace('.', ',') + '%'


def dit(s): return f'{s[8:10]}/{s[5:7]}/{s[0:4]}' if s else '—'


def drawdown52(close, win=252):
    out = [None] * len(close)
    for i, c in enumerate(close):
        if c is None: continue
        xs = [x for x in close[max(0, i - win + 1):i + 1] if x is not None]
        out[i] = (c / max(xs) - 1) * 100
    return out


def change(a, h, t=None):
    if t is None: t = len(a) - 1
    while t >= 0 and a[t] is None: t -= 1
    if t - h >= 0 and a[t] is not None and a[t - h] is not None: return (a[t] / a[t - h] - 1) * 100
    return None


def model():
    """tutte le serie e gli indicatori della vista 8"""
    out = {'fx': {}, 'ix': {}, 'rs': {}}
    dl = plain(em(CFG['fred'])); dl.update(dollar_ind(dl)); out['dollar'] = dl
    acwi = em(CFG['benchmark'])
    for k in CFG['order']:
        c = CFG['indices'][k]
        if c['fx']:
            S = clean(c['fx'], em(c['fx'])); S.update(fx_ind(S)); out['fx'][k] = S
        out['ix'][k] = index(k)
        out['rs'][k] = rel_strength(em(c['etf']), acwi)
    return out

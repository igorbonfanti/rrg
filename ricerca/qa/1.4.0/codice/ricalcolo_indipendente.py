"""Ricalcolo indipendente (Python, senza il codice JS) di z, F, D, media 200, variazione a 63 sedute e forza relativa della
vista 8 da data/emerging.json, confrontato con l'uscita di js/emerging.js (dump_js.mjs).
Definizioni riscritte dal testo di ricerca/emergenti/backtest/script/backtest.mjs (intestazione) e di js/emerging.js.
Uso: python3 -I ricalcolo_indipendente.py <data/emerging.json> <config/emerging.json> <js_out.json>"""
import json, math, sys
from datetime import date, timedelta

em, cfg, js = (json.load(open(p)) for p in sys.argv[1:4])

def decode(x):
    d = date.fromisoformat(x['d0']); dates = [d]
    for ch in x['gaps']:
        d = d + timedelta(days=int(ch, 36)); dates.append(d)
    vals, p = [], None
    for r in x['cd']:
        if r is None: p = None; vals.append(None); continue
        p = r if p is None else p + r; vals.append(p / x['ps'])
    return [str(z) for z in dates], vals

def days(a, b): return (date.fromisoformat(b) - date.fromisoformat(a)).days

def clean(sym, dates, v):
    tight = 'CNY' in sym or 'HKD' in sym
    thr, back = (0.01, 0.003) if tight else (0.03, 0.01)
    bad = set()
    for i in range(1, len(v) - 1):
        r1, r2 = math.log(v[i] / v[i-1]), math.log(v[i+1] / v[i])
        if abs(r1) > thr and abs(r2) > thr and (r1 > 0) != (r2 > 0) and abs(r1 + r2) < back: bad.add(i)
    keep = [i for i in range(len(v)) if i not in bad]
    return [dates[i] for i in keep], [v[i] for i in keep], sorted(dates[i] for i in bad)

def seg(dates):
    """numero del tratto senza buchi oltre 10 giorni"""
    s, out = 0, [0]
    for i in range(1, len(dates)):
        if days(dates[i-1], dates[i]) > 10: s += 1
        out.append(s)
    return out

def win_ok(sg, i, k): return i - k >= 0 and sg[i] == sg[i-k]

def fx_signals(dates, v, w=63, look=126, sdN=756, back=0.5):
    n, sg = len(v), seg(dates)
    lr = [math.log(v[i] / v[i-w]) if win_ok(sg, i, w) else None for i in range(n)]
    sd, z, F = [None]*n, [None]*n, [None]*n
    for i in range(n):
        lo = max(0, i - sdN + 1)
        xs = [x for x in lr[lo:i+1] if x is not None]  # finestra esplicita (non somme scorrevoli)
        if len(xs) >= 0.9 * sdN and days(dates[lo], dates[i]) <= 1278:
            m = sum(xs) / len(xs); sd[i] = math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
        if sd[i] and lr[i] is not None: z[i] = lr[i] / sd[i]
    for i in range(n):
        if sd[i] is None or i - look + 1 < 0 or not win_ok(sg, i, w - 1): continue
        zs = [x for x in z[i-look+1:i+1] if x is not None]
        if len(zs) < 0.9 * look: continue
        mx = max(v[i-w+1:i+1])
        F[i] = 1 if (any(x >= 1 for x in zs) and math.log(mx / v[i]) >= back * sd[i]) else 0
    return z, F, sd

def dollar(dates, v, ma=200, w=63):
    n, sg = len(v), seg(dates)
    D, sma, ch = [None]*n, [None]*n, [None]*n
    for i in range(n):
        if win_ok(sg, i, w): ch[i] = (v[i] / v[i-w] - 1) * 100
        if not win_ok(sg, i, ma - 1): continue
        sma[i] = sum(v[i-ma+1:i+1]) / ma
        if win_ok(sg, i, max(ma - 1, w)): D[i] = 1 if (v[i] < sma[i] and v[i] < v[i-w]) else 0
    return D, sma, ch

def ema(a, n):
    k, p, out = 2 / (n + 1), None, []
    for x in a:
        if x is None: out.append(None); continue
        p = x if p is None else p + k * (x - p); out.append(p)
    return out

def rs(etf, bench):
    (de, ve), (db, vb) = etf, bench
    bm = dict(zip(db, vb))
    rows = [(d, x, bm[d]) for d, x in zip(de, ve) if d in bm]
    wk = {}
    for i, (d, _, _) in enumerate(rows): wk[date.fromisoformat(d).isocalendar()[:2]] = i  # ultima seduta della settimana ISO
    idx = sorted(wk.values())
    lr = [math.log(rows[i][1] / rows[i][2]) for i in idx]
    n, lam, sig, v2, cnt = len(lr), 0.5 ** (1 / 26), [None]*len(lr), None, 0
    for i in range(1, n):
        r = lr[i] - lr[i-1]; v2 = r*r if v2 is None else lam*v2 + (1-lam)*r*r; cnt += 1
        if cnt >= 26: sig[i] = math.sqrt(v2)
    es, el, k = ema(lr, 10), ema(lr, 30), math.sqrt(10)
    X = [None if i < 30 or not sig[i] else (es[i] - el[i]) / (sig[i] * k) for i in range(n)]
    eX = ema(X, 8)
    ratio = 100 + 2.5 * X[-1]; mom = 100 + 2.5 * math.sqrt(8) * (X[-1] - eX[-1])
    return rows[idx[-1]][0], ratio, mom

def cmp(name, a, b, tol):
    bad = [(i, x, y) for i, (x, y) in enumerate(zip(a, b)) if (x is None) != (y is None) or (x is not None and abs(x - y) > tol)]
    print(f'{name:32s} {len(a):5d} valori, diversi: {len(bad)}' + (f'  primo: {bad[0]}' if bad else ''))
    return len(bad) == 0 and len(a) == len(b)

ok = True; checks = 0
for k in cfg['order']:
    c = cfg['indices'][k]
    if not c['fx']: continue
    s = c['fx']; d, v = decode(em['series'][s]); dc, vc, rem = clean(s, d, v)
    J = js['fx'][s]
    ok &= dc == J['dates'] and rem == [x['date'] for x in J['removed']]; checks += 1
    z, F, sd = fx_signals(dc, vc)
    ok &= cmp(f'{s} z', z, J['z'], 1e-9); ok &= cmp(f'{s} F', F, J['F'], 0); ok &= cmp(f'{s} sd', sd, J['sd'], 1e-12); checks += 3
    print(f'   ultimo {dc[-1]} cambio {vc[-1]} z {z[-1]:.4f} F {F[-1]} tolte {rem}')
d, v = decode(em['series'][cfg['fred']]); D, sma, ch = dollar(d, v); J = js['dollar']
ok &= cmp('DTWEXEMEGS D', D, J['D'], 0); ok &= cmp('DTWEXEMEGS sma', sma, J['sma'], 1e-9); ok &= cmp('DTWEXEMEGS ch63', ch, J['ch'], 1e-9); checks += 3
print(f'   ultimo {d[-1]} valore {v[-1]} sma {sma[-1]:.4f} ch {ch[-1]:.3f} D {D[-1]}')
B = decode(em['series'][cfg['benchmark']])
for k in cfg['order']:
    e = cfg['indices'][k]['etf']; last, ratio, mom = rs(decode(em['series'][e]), B); J = js['rs'][e]
    good = J['last'] == last and abs(J['ratio'] - ratio) < 1e-9 and abs(J['mom'] - mom) < 1e-9
    print(f'RS {e:5s} {last} ratio {ratio:.4f}/{J["ratio"]:.4f} mom {mom:.4f}/{J["mom"]:.4f} {"ok" if good else "DIVERSO"}'); ok &= good; checks += 1
print('CONTROLLI', checks, 'TUTTI OK' if ok else 'CON DIFFERENZE')

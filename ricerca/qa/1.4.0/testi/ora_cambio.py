"""Controllo testi 1.4.0: a che ora si riferisce la «chiusura» di Yahoo del cambio datata d?
Confronta le variazioni giornaliere di Yahoo (data/emerging.json) con quelle del cambio FRED H.10 (mezzogiorno di New York)
dello stesso giorno d e del giorno prima d-1, dal 2018. Se Yahoo(d) segue FRED(d-1), la «chiusura» del giorno d è un prezzo
della sera prima (come dice la nota 1.3.5 del README), non la chiusura di Londra del giorno d.
Uso: python3 -I ora_cambio.py <repository> <cache del backtest>"""
import json, math, sys
from datetime import date, timedelta
ROOT, CACHE = sys.argv[1], sys.argv[2]
def dd(d0, g):
    o = [d0]; t = date.fromisoformat(d0)
    for c in g: t += timedelta(days=int(c, 36)); o.append(t.isoformat())
    return o
def dl(a, s):
    p = None; o = []
    for r in a: p = r if p is None else p + r; o.append(p / s)
    return o
def corr(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
E = json.load(open(f'{ROOT}/data/emerging.json'))['series']
for sym, fid in {'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'INR=X': 'DEXINUS', 'TWD=X': 'DEXTAUS'}.items():
    x = E[sym]; d = dd(x['d0'], x['gaps']); v = dl(x['cd'], x.get('ps', 1))
    y = {a: b for a, b in zip(d, v) if a >= '2018-01-01'}
    fr = [tuple(r) for r in json.load(open(f'{CACHE}/{fid}.json'))['rows'] if r[0] >= '2017-12-01']
    fi = {a: i for i, (a, _) in enumerate(fr)}
    ys = sorted(y); out = {0: ([], []), 1: ([], [])}
    for i in range(1, len(ys)):
        a, b = ys[i - 1], ys[i]
        if (date.fromisoformat(b) - date.fromisoformat(a)).days > 4: continue
        ry = math.log(y[b] / y[a])
        for lag in (0, 1):
            # FRED dello stesso giorno (lag 0) o del giorno lavorativo prima (lag 1) per entrambe le date
            ia, ib = fi.get(a), fi.get(b)
            if ia is None or ib is None or ib != ia + 1 or ia - lag < 0: continue
            rf = math.log(fr[ib - lag][1] / fr[ia - lag][1])
            out[lag][0].append(ry); out[lag][1].append(rf)
    print(sym, 'correlazione delle variazioni giornaliere con FRED dello stesso giorno:', round(corr(*out[0]), 3), '| con FRED del giorno prima:', round(corr(*out[1]), 3), f'(n={len(out[0][0])})')

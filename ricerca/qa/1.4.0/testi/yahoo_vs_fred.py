"""Controllo testi 1.4.0: scarto tra il cambio di Yahoo usato dall'app (data/emerging.json, dopo la pulizia di cleanFx)
e il cambio FRED H.10 dello stesso giorno, per anno: numero di date con scarto oltre il 3%.
Uso: python3 -I yahoo_vs_fred.py <repository> <cache del backtest>"""
import json, math, sys, collections, statistics
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
E = json.load(open(f'{ROOT}/data/emerging.json'))['series']
for sym, fid in {'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS'}.items():
    x = E[sym]; d = dd(x['d0'], x['gaps']); v = dl(x['cd'], x.get('ps', 1))
    tight = 'CNY' in sym; thr, back = (0.01, 0.003) if tight else (0.03, 0.01); bad = set()
    for i in range(1, len(v) - 1):
        r1, r2 = math.log(v[i] / v[i - 1]), math.log(v[i + 1] / v[i])
        if abs(r1) > thr and abs(r2) > thr and (r1 > 0) != (r2 > 0) and abs(r1 + r2) < back: bad.add(i)
    fr = dict(map(tuple, json.load(open(f'{CACHE}/{fid}.json'))['rows']))
    by = collections.defaultdict(list)
    for i, (a, b) in enumerate(zip(d, v)):
        if i in bad or a not in fr: continue
        by[a[:4]].append(abs(b / fr[a] - 1) * 100)
    over = {y: sum(x > 3 for x in l) for y, l in by.items() if sum(x > 3 for x in l)}
    allv = [x for l in by.values() for x in l]
    print(f'{sym}: {len(allv)} date in comune, scarto mediano {statistics.median(allv):.2f}%, oltre il 3%: {sum(over.values())} date', dict(sorted(over.items())))

#!/usr/bin/env python3
"""A che ora del giorno corrisponde il «close» dei cambi di Yahoo nel file? Scarto mediano di Yahoo(t) contro
BCE delle 14:15 CET (t), FRED H.10 di mezzogiorno a New York (t) e FRED del giorno prima (t-1), dal 2023.
Uso: python3 -I orario_cambio.py <sito>"""
import sys, os, csv, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('rc', os.path.join(HERE, 'ricalcolo_lib.py')); rc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rc)
rc.init(sys.argv[1])
def ecb(c): return {r['TIME_PERIOD']: float(r['OBS_VALUE']) for r in csv.DictReader(open(os.path.join(HERE, 'ecb', c + '.csv'))) if r['OBS_VALUE']}
def fred(s): return [(r[0], float(r[1])) for r in list(csv.reader(open(os.path.join(HERE, 'fred', s + '.csv'))))[1:] if r[1] not in ('', '.')]
U = ecb('USD')
for sym, c, fs in [('KRW=X', 'KRW', 'DEXKOUS'), ('BRL=X', 'BRL', 'DEXBZUS'), ('INR=X', 'INR', 'DEXINUS'), ('CNY=X', 'CNY', 'DEXCHUS')]:
    E = ecb(c); F = fred(fs); fm = dict(F); prev = {F[i][0]: F[i - 1][1] for i in range(1, len(F))}
    d, v = rc.series(sym)
    a, b, p = [], [], []
    for x, y in zip(d, v):
        if x < '2023-01-01' or x not in E or x not in U or x not in fm or x not in prev: continue
        a.append(abs(y / (E[x] / U[x]) - 1)); b.append(abs(y / fm[x] - 1)); p.append(abs(y / prev[x] - 1))
    med = lambda z: sorted(z)[len(z) // 2] * 100
    print(f'{sym}: n={len(a)} · scarto mediano contro BCE 14:15 CET {med(a):.3f}% · contro FRED mezzogiorno NY {med(b):.3f}% · contro FRED del giorno prima {med(p):.3f}%')
# sfasamento: Yahoo(t) contro FRED(t-1), FRED(t), FRED(t+1), separando ora legale e ora solare di Londra (aprile-settembre / novembre-febbraio)
print('--- sfasamento (scarto mediano %, FRED t-1 / t / t+1) ---')
for sym, fs in [('CNY=X', 'DEXCHUS'), ('KRW=X', 'DEXKOUS'), ('INR=X', 'DEXINUS'), ('TWD=X', 'DEXTAUS'), ('BRL=X', 'DEXBZUS')]:
    F = fred(fs); idx = {x[0]: i for i, x in enumerate(F)}
    d, v = rc.series(sym)
    for label, months in (('estate', range(4, 10)), ('inverno', (11, 12, 1, 2))):
        acc = {-1: [], 0: [], 1: []}
        for x, y in zip(d, v):
            if x < '2023-01-01' or int(x[5:7]) not in months or x not in idx: continue
            i = idx[x]
            if i - 1 < 0 or i + 1 >= len(F): continue
            for s in (-1, 0, 1): acc[s].append(abs(y / F[i + s][1] - 1))
        med = lambda z: sorted(z)[len(z) // 2] * 100
        print(f'{sym} {label}: n={len(acc[0])} · t-1 {med(acc[-1]):.3f} · t {med(acc[0]):.3f} · t+1 {med(acc[1]):.3f}')
# terza fonte: BCE (14:15 CET) del giorno t-1, t, t+1 contro Yahoo(t)
print('--- BCE t-1 / t / t+1 contro Yahoo(t) (scarto mediano %) ---')
for sym, c in [('CNY=X', 'CNY'), ('KRW=X', 'KRW'), ('INR=X', 'INR'), ('BRL=X', 'BRL')]:
    E = ecb(c); ds = sorted(x for x in E if x in U); r = {x: E[x] / U[x] for x in ds}; pos = {x: i for i, x in enumerate(ds)}
    d, v = rc.series(sym); acc = {-1: [], 0: [], 1: []}
    for x, y in zip(d, v):
        if x not in pos: continue
        i = pos[x]
        if i < 1 or i + 1 >= len(ds): continue
        for s in (-1, 0, 1): acc[s].append(abs(y / r[ds[i + s]] - 1))
    med = lambda z: sorted(z)[len(z) // 2] * 100
    print(f'{sym}: n={len(acc[0])} · BCE t-1 {med(acc[-1]):.3f} · t {med(acc[0]):.3f} · t+1 {med(acc[1]):.3f}')

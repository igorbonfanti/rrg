# C8 bis. Titoli degli indici con prezzi «fermi» di Yahoo (volume 0 e chiusura uguale per ≥ 20 sedute di fila: titolo
# sospeso) e salti di scala senza rientro (rapporto ≤ 0,25 o ≥ 4), che la pipeline tratta come errori di scala e
# riscala all'indietro. Sui membri di oggi degli indici controllati in c2_indices.py (cache dell'endpoint chart, 2 anni).
# uso: python3 -I c8_stale_members.py
import sys, os, glob, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series, W
seen = set()
for f in sorted(glob.glob(os.environ.get('RRG', '/home/user/rrg') + '/data/index_members/*.json')):
    k = os.path.basename(f)[:-5]
    for s in load(f'index_members/{k}.json')['tickers']:
        p = W + 'yahoo/' + __import__('urllib.parse').parse.quote(s, safe='') + '__2y.json'
        if s in seen or not os.path.exists(p):
            continue
        seen.add(s); y = series(s, '2y')
        if not y or not y['dates']:
            continue
        c, v, d = y['close'], y['vol'], y['dates']
        run, best = 0, (0, None, None)
        for i in range(1, len(c)):
            run = run + 1 if (v[i] == 0 and c[i] == c[i - 1]) else 0
            if run > best[0]:
                best = (run, d[i - run + 1], d[i])
        jumps = [(d[i], round(c[i] / c[i - 1], 3)) for i in range(1, len(c)) if c[i] / c[i - 1] <= 0.25 or c[i] / c[i - 1] >= 4]
        if best[0] >= 20 or jumps:
            print(f'{k:8} {s:12} fermo {best[0]} sedute ({best[1]} → {best[2]}) salti {jumps}')
print('titoli controllati:', len(seen))

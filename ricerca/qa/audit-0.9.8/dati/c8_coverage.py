# C8. Copertura della breadth degli indici: sedute in cui i titoli contati (n) sono molto meno dei membri (festività
# lunghe di una parte delle borse, titoli senza prezzo) e salto della % sopra la media 200 rispetto alle sedute vicine.
# uso: python3 -I c8_coverage.py [da]
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import app_index, R
FROM = sys.argv[1] if len(sys.argv) > 1 else '2024-10-01'
cfg = json.load(open(R + 'config/indices.json'))['indices']
for k in cfg:
    A = app_index(k); ds = sorted(d for d in A['br'] if d >= FROM)
    low = []
    for i, d in enumerate(ds):
        b = A['br'][d]
        if not b['members'] or b['a200'] is None:
            continue
        cov = b['n'] / b['members']
        if cov < 0.8:
            p = 100 * b['a200'] / b['n']
            nb = [100 * A['br'][x]['a200'] / A['br'][x]['n'] for x in ds[max(0, i - 2):i] + ds[i + 1:i + 3] if A['br'][x]['n'] and A['br'][x]['n'] / A['br'][x]['members'] >= 0.8]
            low.append((d, b['n'], b['members'], round(p, 1), round(sum(nb) / len(nb), 1) if nb else None))
    if low:
        print(f'{k:9} sedute con copertura < 80% dal {FROM}: {len(low)}', low[:8])

import json, sys
sys.path.insert(0, '.')
import ref
from common import *
r = json.load(open('out/perflate.json')); P = ref.J('prices_global.json'); D = P['dates']
win = r['win']; i0, i1 = D.index(win[0]), D.index(win[-1]); scen = 'C2b_global_MWEQ_tardivo'
lines = {}
for s in r['syms'] + [r['bench']]:
    c = P['tickers'][s]['close']; j = i0
    while j <= i1 and c[j] is None: j += 1
    if j >= i1: continue
    lines[s] = (D[j], [None if (c[i] is None or i < j) else c[i] / c[j] * 100 for i in range(i0, i1 + 1)])
bad = []
for d, rows in r['tips']:
    k = win.index(d); got = sorted(num(x[1]) for x in rows[1:]) if rows else None
    exp = sorted(round(v[k], 1) for _, v in lines.values() if v[k] is not None)
    if not rows or len(got) != len(exp) or any(abs(a - b) > 0.051 for a, b in zip(got, exp)): bad.append((d, got, exp))
m = lines['MWEQ.MI']; k7 = win.index('2024-10-07')
t7 = dict((x[0], x[1]) for x in r['tips'][k7][1][1:]); t6 = dict((x[0], x[1]) for x in r['tips'][k7 - 1][1][1:])
rec(scen, f'linea che inizia dopo il tratto: base 100 alla sua prima chiusura ({m[0]}), tutte le linee in {len(win)} sedute', not bad and m[0] == '2024-10-07' and t7.get('MWEQ.MI') == '100,0' and 'MWEQ.MI' not in t6 and 'MWEQ.MI quotato dal 07/10/2024: base 100 da quel giorno' in r['legend'], f'{bad[:2]} · MWEQ il 07/10: {t7.get("MWEQ.MI")}, il giorno prima: {t6.get("MWEQ.MI", "assente")} · legenda «{r["legend"]}»')

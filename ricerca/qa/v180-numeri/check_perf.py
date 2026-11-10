import json, sys
sys.path.insert(0, '.')
import ref
from common import *
R = json.load(open('out/perf.json'))
for scen, r in R.items():
    if not r.get('chip'): rec(scen, 'zoom applicato', False, f"nessuno zoom: periodo {r['edgesBefore']} (tratto chiesto fuori dal periodo)"); continue
    P = ref.J('prices.json' if 'US' in scen else 'prices_global.json'); D = P['dates']
    win = r['win']; d0, d1 = win[0], win[-1]; i0, i1 = D.index(d0), D.index(d1); n = len(win)
    grp = P['groups'][r['group']]; syms = [s for s in grp['tickers'] if s in P['tickers'] and s != r['bench']] + [r['bench']]
    rec(scen, 'etichetta, bordi e legenda', r['chip'] == f'Zoom: dal {dIT(d0)} al {dIT(d1)}' and r['edges'] == [dIT(d0), dIT(d1)] and f'zoom dal {dIT(d0)} al {dIT(d1)}, base 100 al {dIT(d0)}' in r['legend'], f"{r['chip']} · legenda «{r['legend']}»")
    lines = {}
    for s in syms:
        c = P['tickers'][s]['close']; j = i0
        while j <= i1 and c[j] is None: j += 1
        if j >= i1: continue
        lines[s] = [None if (c[i] is None or i < j) else c[i] / c[j] * 100 for i in range(i0, i1 + 1)]
    bad = []
    for d, rows in r['tips']:
        k = win.index(d)
        got = sorted(num(x[1]) for x in rows[1:]) if rows else None
        exp = sorted(round(v[k] + 1e-12, 1) for v in lines.values() if v[k] is not None)
        if not rows or iso(rows[0][0]) != d or len(got) != len(exp) or any(abs(a - b) > 0.051 for a, b in zip(got, exp)): bad.append((d, got, exp))
    first = [num(x[1]) for x in (r['tips'][0][1] or [[0]])[1:]]
    rec(scen, f'base 100: ogni linea = chiusura / chiusura del primo giorno × 100 ({n} sedute × {len(lines)} linee)', not bad and all(v == 100.0 for v in first), f'{bad[:2]} · primo giorno {first[:4]}…')
    vals = [v for a in lines.values() for v in a if v is not None]; lo, hi = min(vals), max(vals); pad = (hi - lo) * 0.06 or 1; lo -= pad; hi += pad
    fr = [x for x in r['dump']['rects'] if x['cls'] == 'frame'][0]; L, PW, T, PH = fr['x'], fr['w'], fr['y'], fr['h']
    sy = lambda v: T + (1 - (v - lo) / (hi - lo)) * PH
    paths = [x['pts'] for x in r['dump']['paths'] if x['cls'].startswith('ln')]
    allpts = [p for ps in paths for p in ps]
    ok_in = all(L - 0.1 <= p[1] <= L + PW + 0.1 and T - 0.1 <= p[2] <= T + PH + 0.1 for p in allpts)
    ys = sorted(p[2] for p in allpts); 
    rec(scen, 'scala sui valori visibili, punti nel riquadro', ok_in and abs(ys[0] - sy(max(vals))) < 0.06 and abs(ys[-1] - sy(min(vals))) < 0.06 and len(allpts) == sum(1 for a in lines.values() for v in a if v is not None), f'y min {ys[0]:.1f} (atteso {sy(max(vals)):.1f}), y max {ys[-1]:.1f} (atteso {sy(min(vals)):.1f}), punti {len(allpts)}')
    endl = [t['t'] for t in r['dump']['texts'] if t['cls'].startswith('endl')]
    ends = {fmt(v[-1], 0) for v in lines.values() if v[-1] is not None}
    rec(scen, 'etichette finali = valore all\'ultima seduta del tratto', all(e.split(' ')[-1] in ends for e in endl) and len(endl) >= 2, f'{endl}')
    tk = sorted([(t['x'], t['t']) for t in r['dump']['texts'] if t['cls'] == 'axt' and t['anchor'] == 'middle'])
    badt = [(lab, win[round((x - L) / PW * (n - 1))]) for x, lab in tk if not tick_ok(lab, win[round((x - L) / PW * (n - 1))])]
    rec(scen, f'asse del tempo ({len(tk)} etichette) uguale alla seduta sotto', len(tk) >= 2 and not badt, f'{[l for _, l in tk]} · sbagliate {badt}')

#!/usr/bin/env python3
"""Prova: INR con le soglie strette di CNY e HKD (1% e 0,3%) e con 1% e 0,5%: quali sedute toglierebbe cleanFx e come
cambierebbero gli stati della valuta negli ultimi 3 anni. Uso: python3 -I inr_stretto.py <sito>"""
import sys, os, math, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('rc', os.path.join(HERE, 'ricalcolo_lib.py')); rc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rc)
rc.init(sys.argv[1])
d, v = rc.series('INR=X')
def clean(thr, back):
    bad = set()
    for i in range(1, len(v) - 1):
        r1, r2 = math.log(v[i] / v[i - 1]), math.log(v[i + 1] / v[i])
        if abs(r1) > thr and abs(r2) > thr and (r1 > 0) != (r2 > 0) and abs(r1 + r2) < back: bad.add(i)
    return [x for i, x in enumerate(d) if i not in bad], [x for i, x in enumerate(v) if i not in bad], [d[i] for i in sorted(bad)]
base = clean(0.03, 0.01)
zb, Fb, _ = rc.fx_signals(base[0], base[1]); sb = {x: rc.state(Fb[i], zb[i]) for i, x in enumerate(base[0])}
for thr, back in ((0.01, 0.003), (0.01, 0.005)):
    cd, cv, rem = clean(thr, back)
    z, F, _ = rc.fx_signals(cd, cv); s = {x: rc.state(F[i], z[i]) for i, x in enumerate(cd)}
    diff = [x for x in cd if x >= '2023-11-04' and x in sb and s[x] != sb[x]]
    print(f'soglie {thr}/{back}: tolte {len(rem)} {rem} · stati diversi negli ultimi 3 anni {len(diff)} (da {diff[:1]} a {diff[-1:]}) · oggi {s[cd[-1]]} z {z[-1]:.3f}')

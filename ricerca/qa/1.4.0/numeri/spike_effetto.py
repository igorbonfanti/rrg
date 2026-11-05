#!/usr/bin/env python3
"""Errori isolati di Yahoo NON tolti da cleanFx (confronto con FRED H.10) e loro effetto sugli stati della valuta.
Errore isolato: Yahoo lontano da FRED oltre la tolleranza (1,5%; 0,5% per CNY e HKD) e fuori dall'intervallo FRED di t-1..t+1,
mentre Yahoo il giorno prima e il giorno dopo è vicino a FRED (entro metà tolleranza). Si tolgono come fa cleanFx
(giorno mancante) e si ricalcolano gli stati. Uso: python3 -I spike_effetto.py <sito>"""
import sys, os, csv, json, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('rc', os.path.join(HERE, 'ricalcolo_lib.py')); rc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rc)
rc.init(sys.argv[1])
FM = {'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS'}
res = {}
for sym, fs in FM.items():
    F = [(r[0], float(r[1])) for r in list(csv.reader(open(os.path.join(HERE, 'fred', fs + '.csv'))))[1:] if r[1] not in ('', '.')]
    fm = dict(F); fd = [x[0] for x in F]; pos = {x: i for i, x in enumerate(fd)}
    tol = 0.005 if sym == 'CNY=X' else 0.015
    d, v = rc.series(sym); cd, cv, rem = rc.clean(sym, d, v)
    spikes = []
    for i in range(1, len(cd) - 1):
        x = cd[i]
        if x not in pos: continue
        j = pos[x]; nb = [F[k][1] for k in range(max(0, j - 1), min(len(F), j + 2))]
        if not (cv[i] < min(nb) * (1 - tol) or cv[i] > max(nb) * (1 + tol)): continue
        okn = all(abs(cv[q] / fm[cd[q]] - 1) < tol / 2 for q in (i - 1, i + 1) if cd[q] in fm)
        if okn: spikes.append((x, cv[i], fm[x], round((cv[i] / fm[x] - 1) * 100, 2)))
    s = {x[0] for x in spikes}
    z, Fv, sd = rc.fx_signals(cd, cv)
    cd2 = [x for x in cd if x not in s]; cv2 = [y for x, y in zip(cd, cv) if x not in s]
    z2, F2, sd2 = rc.fx_signals(cd2, cv2)
    a = {x: rc.state(Fv[i], z[i]) for i, x in enumerate(cd)}; b = {x: rc.state(F2[i], z2[i]) for i, x in enumerate(cd2)}
    win = [x for x in cd2 if x >= '2023-11-04']
    ch = [(x, a[x], b[x]) for x in win if a[x] != b[x]]
    runs = []
    for x, p, q in ch:
        if runs and runs[-1][2] == (p, q) and True: runs[-1][1] = x; runs[-1][3] += 1
        else: runs.append([x, x, (p, q), 1])
    res[sym] = {'spikes': spikes, 'oggi_app': (cd[-1], a[cd[-1]], round(z[-1], 3), round(sd[-1], 5)), 'oggi_senza': (cd2[-1], b[cd2[-1]], round(z2[-1], 3), round(sd2[-1], 5)),
                'sedute_diverse_in_3A': len(ch), 'tratti': [(r[0], r[1], r[2][0] + '→' + r[2][1], r[3]) for r in runs]}
    print(sym, 'errori isolati non tolti:', len(spikes), [x for x in spikes if x[0] >= '2023-01-01'])
    print('   oggi app', res[sym]['oggi_app'], '| senza errori', res[sym]['oggi_senza'], '| sedute 3A con stato diverso', len(ch))
    for r in res[sym]['tratti']: print('     ', r)
json.dump(res, open(os.path.join(HERE, 'spike_effetto.json'), 'w'), indent=1)

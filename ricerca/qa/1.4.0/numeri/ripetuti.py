#!/usr/bin/env python3
"""Valori consecutivi identici (3 o più sedute) nelle serie di data/emerging.json dal novembre 2023. Uso: python3 -I ripetuti.py <sito>"""
import sys, os, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('rc', os.path.join(HERE, 'ricalcolo_lib.py')); rc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rc)
rc.init(sys.argv[1])
for s in rc.EMG['series']:
    d, v = rc.series(s); runs = []; i = 0
    while i < len(v):
        j = i
        while j + 1 < len(v) and v[j + 1] == v[i]: j += 1
        if j - i >= 2 and d[i] >= '2023-11-01': runs.append((d[i], d[j], j - i + 1, v[i]))
        i = j + 1
    print(s, len(runs), 'serie ferme ·', sum(r[2] - 1 for r in runs), 'sedute ripetute', runs)

#!/usr/bin/env python3
"""Stampa Yahoo (file) e FRED attorno a una data: python3 -I vicini.py <sito> <SYM=X> <data> [giorni]"""
import sys, os, csv, importlib.util, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('rc', os.path.join(HERE, 'ricalcolo_lib.py')); rc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rc)
rc.init(sys.argv[1]); sym, day = sys.argv[2], sys.argv[3]; k = int(sys.argv[4]) if len(sys.argv) > 4 else 6
FM = {'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS', 'HKD=X': 'DEXHKUS'}
f = {r[0]: r[1] for r in list(csv.reader(open(os.path.join(HERE, 'fred', FM[sym] + '.csv'))))[1:]}
d, v = rc.series(sym); cd, cv, rem = rc.clean(sym, d, v); rs = {r[0] for r in rem}
i = next(j for j, x in enumerate(d) if x >= day)
for j in range(max(0, i - k), min(len(d), i + k + 1)):
    fr = f.get(d[j]); fv = float(fr) if fr not in (None, '', '.') else None
    print(d[j], dt.date.fromisoformat(d[j]).strftime('%a'), f'{v[j]:.4f}', 'FRED', fr, '' if fv is None else f'{(v[j]/fv-1)*100:+.2f}%', 'TOLTO' if d[j] in rs else '')

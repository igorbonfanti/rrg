"""Controllo testi 1.4.0: le sedute del cambio che js/emerging.js toglie come «errori di stampa di Yahoo» lo sono davvero?
Per ogni seduta tolta (stessa regola di cleanFx) confronta il valore di Yahoo con il cambio FRED H.10 dello stesso giorno
(mezzogiorno di New York) e con i valori di Yahoo del giorno prima e dopo.
Uso: python3 -I errori_vs_fred.py <cartella del repository> <cartella della cache del backtest (scarica.mjs)>"""
import json, math, sys
from datetime import date, timedelta
ROOT, CACHE = sys.argv[1], sys.argv[2]
def dec_dates(d0, gaps):
    out = [d0]; t = date.fromisoformat(d0)
    for ch in gaps: t += timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out
def dec_delta(a, s):
    p = None; o = []
    for r in a: p = r if p is None else p + r; o.append(p / s)
    return o
E = json.load(open(f'{ROOT}/data/emerging.json'))['series']
FR = {'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS'}
tot = gen = 0
for sym, fid in FR.items():
    x = E[sym]; d = dec_dates(x['d0'], x['gaps']); v = dec_delta(x['cd'], x.get('ps', 1))
    fr = dict(map(tuple, json.load(open(f'{CACHE}/{fid}.json'))['rows']))
    tight = 'CNY' in sym; thr, back = (0.01, 0.003) if tight else (0.03, 0.01)
    for i in range(1, len(v) - 1):
        r1, r2 = math.log(v[i] / v[i - 1]), math.log(v[i + 1] / v[i])
        if not (abs(r1) > thr and abs(r2) > thr and (r1 > 0) != (r2 > 0) and abs(r1 + r2) < back): continue
        tot += 1
        f = fr.get(d[i]); fp = fr.get(d[i - 1])
        dev = None if f is None else (v[i] / f - 1) * 100
        devp = None if fp is None else (v[i - 1] / fp - 1) * 100
        # «vero movimento»: Yahoo del giorno tolto vicino a FRED (entro un terzo del salto) e FRED si è mosso nello stesso verso
        real = f is not None and fp is not None and abs(math.log(v[i] / f)) < abs(r1) / 3 and (math.log(f / fp) > 0) == (r1 > 0)
        gen += real
        print(f"{sym} {d[i]} Yahoo {v[i-1]:.4f} → {v[i]:.4f} → {v[i+1]:.4f} | FRED {fp} → {f}  scarto Yahoo/FRED {'—' if dev is None else f'{dev:+.2f}%'}{'  ← FRED conferma il movimento' if real else ''}")
print(f'\nSedute tolte: {tot}; di queste con FRED che conferma il movimento (non un errore di stampa): {gen}')

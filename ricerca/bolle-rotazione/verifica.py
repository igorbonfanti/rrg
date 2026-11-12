#!/usr/bin/env python3
"""
verifica.py — ricalcolo indipendente (Python, metodo diverso: pandas no, solo liste e max/min espliciti per data) dei
numeri di risultati.json scritti da dati.mjs, sugli stessi file della cache. Controlla, per ogni mercato:
massimo di chiusura e data, distanza %, minimo dopo il massimo, gli stessi valori al 09/11/2026 (05/11 per il bitcoin)
e il massimo intraday. In più cerca i periodi in cui la serie CBBTCUSD di FRED è datata un giorno prima di Yahoo.

Uso: python3 -I ricerca/bolle-rotazione/verifica.py
Esce con codice 1 se un numero non coincide (tolleranza 0,01 punti sulle percentuali, 1e-6 relativo sui prezzi).
"""
import json, os, sys, datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
R = json.load(open(os.path.join(HERE, 'risultati.json'), encoding='utf-8'))

FILES = {'BTC': 'Y_BTC-USD', 'GOLD': 'Y_GC_F', 'SILVER': 'Y_SI_F', 'COPPER': 'Y_HG_F', 'WTI': 'Y_CL_F', 'BRENT': 'Y_BZ_F',
         'NDX': 'Y__NDX', 'COMP': 'Y__IXIC', 'SPX': 'Y__GSPC', 'SOXX': 'Y_SOXX', 'KOSPI': 'Y__KS11'}
CUT = {'BTC': '2026-11-05'}


def load(name):
    return json.load(open(os.path.join(CACHE, name + '.json'), encoding='utf-8'))


def stats(rows):
    """rows: lista di (data, chiusura, massimo). Massimo con la prima data in caso di parità (confronto stretto)."""
    best = None
    for d, c, h in rows:
        if best is None or c > best[1]:
            best = (d, c)
    after = [(d, c) for d, c, h in rows if d >= best[0]]
    low = min(after, key=lambda x: (x[1], x[0]))
    # in caso di parità del minimo vale la prima data, come in dati.mjs
    low = next((d, c) for d, c in after if c == low[1])
    hi = None
    for d, c, h in rows:
        if h is not None and (hi is None or h > hi[1]):
            hi = (d, h)
    last = rows[-1]
    return {'ath': best[1], 'athDate': best[0], 'last': last[1], 'lastDate': last[0],
            'distPct': (last[1] / best[1] - 1) * 100, 'cycleLowPct': (low[1] / best[1] - 1) * 100, 'cycleLowDate': low[0],
            'intradayAth': hi[1] if hi else None, 'intradayAthDate': hi[0] if hi else None,
            'daysSinceAth': (dt.date.fromisoformat(last[0]) - dt.date.fromisoformat(best[0])).days}


bad = 0


def check(label, mine, theirs):
    global bad
    for k in ['athDate', 'lastDate', 'cycleLowDate', 'intradayAthDate', 'daysSinceAth']:
        if mine[k] != theirs[k]:
            print(f'  DIVERSO {label} {k}: {mine[k]} contro {theirs[k]}'); bad += 1
    for k in ['ath', 'last', 'intradayAth']:
        a, b = mine[k], theirs[k]
        if (a is None) != (b is None) or (a is not None and abs(a / b - 1) > 1e-6):
            print(f'  DIVERSO {label} {k}: {a} contro {b}'); bad += 1
    for k in ['distPct', 'cycleLowPct']:
        if abs(round(mine[k], 2) - theirs[k]) > 0.011:
            print(f'  DIVERSO {label} {k}: {mine[k]:.4f} contro {theirs[k]}'); bad += 1


for k, f in FILES.items():
    y = load(f)
    rows = [(d, c, h) for d, c, h in zip(y['dates'], y['close'], y['high']) if c is not None]
    now = stats(rows)
    cut = CUT.get(k, '2026-11-09')
    atc = stats([r for r in rows if r[0] <= cut])
    check(k + ' oggi', now, R['markets'][k]['now'])
    check(k + ' al ' + cut, atc, R['markets'][k]['atCutoff'])
    print(f"{k:7s} massimo {now['ath']:.2f} il {now['athDate']}  ultima {now['last']:.2f} il {now['lastDate']}  "
          f"{now['distPct']:+.2f}%  | al {cut}: {atc['distPct']:+.2f}% (dal massimo intraday {(atc['last'] / atc['intradayAth'] - 1) * 100:+.2f}%)")

# CBBTCUSD (FRED) contro BTC-USD (Yahoo): per ogni giorno, quale sfasamento (0 o +1 giorno sulla data di FRED) dà lo
# scarto minore; poi i tratti continui di almeno 20 giorni con lo stesso sfasamento
y = load('Y_BTC-USD'); c = load('F_CBBTCUSD')
Y = dict(zip(y['dates'], y['close']))
def plus(d, n): return (dt.date.fromisoformat(d) + dt.timedelta(days=n)).isoformat()
lab = []
for d, v in zip(c['dates'], c['close']):
    a, b = Y.get(d), Y.get(plus(d, 1))
    if a and b:
        lab.append((d, 0 if abs(v / a - 1) <= abs(v / b - 1) else 1))
runs = []
for d, l in lab:
    if runs and runs[-1][2] == l:
        runs[-1][1] = d; runs[-1][3] += 1
    else:
        runs.append([d, d, l, 1])
print('\nCBBTCUSD (FRED) contro BTC-USD (Yahoo), tratti di almeno 20 giorni con lo stesso sfasamento:')
for a, b, l, n in runs:
    if n >= 20:
        print(f'  {a} → {b}: {n} giorni, {"stessa data" if l == 0 else "FRED datato un giorno prima di Yahoo"}')

print('\nOK: tutti i numeri coincidono' if not bad else f'\n{bad} differenze')
sys.exit(1 if bad else 0)

"""Controllo testi 1.4.0: ricalcolo indipendente (Python, senza i moduli dell'app) dei numeri di H5 citati nei testi
della vista 8: «la valuta ferma si era già accesa nei sei mesi prima del minimo in 13 cali oltre il 25% su 14» (il denominatore giusto è 15: un episodio con F mai acceso nella finestra è escluso dal backtest) e
«il dollaro favorevole arriva in mediana 110 sedute dopo il minimo (19 cali)».

Definizioni riscritte da ricerca/emergenti/backtest/script/backtest.mjs (commento in testa) e js/emerging.js.
Uso: python3 -I h5_ricalcolo.py <cartella del repository> <cartella della cache del backtest> [app]
  con «app» i cambi vengono da data/emerging.json (la serie dell'app, tagliata dopo l'ultimo buco > 35 giorni)
  invece che dalla cache di scarica.mjs.
"""
import json, math, sys, statistics
from datetime import date, timedelta

ROOT, CACHE = sys.argv[1], sys.argv[2]
FROM_APP = len(sys.argv) > 3 and sys.argv[3] == 'app'
D = lambda s: date.fromisoformat(s)

def dec_dates(d0, gaps):
    out = [d0]; t = D(d0)
    for ch in gaps:
        t += timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out

def dec_delta(a, scale):
    p = None; out = []
    for r in a:
        if r is None: p = None; out.append(None); continue
        p = r if p is None else p + r; out.append(p / scale)
    return out

def index_close(k):
    for f in ('data/indices.json', 'data/indices_more.json'):
        s = json.load(open(f'{ROOT}/{f}'))['series']
        if k in s:
            x = s[k]
            close = dec_delta(x['cd'], x.get('ps', 100)) if 'cd' in x else x['close']
            return dec_dates(x['d0'], x['gaps']), close
    raise KeyError(k)

def fx_rows(sym):
    if FROM_APP:
        x = json.load(open(f'{ROOT}/data/emerging.json'))['series'][sym]
        return list(zip(dec_dates(x['d0'], x['gaps']), dec_delta(x['cd'], x.get('ps', 1))))
    return [tuple(r) for r in json.load(open(f'{CACHE}/' + ''.join(c if c.isalnum() else '_' for c in sym) + '.json'))['rows']]

def clean(sym, rows):
    tight = 'CNY' in sym or 'HKD' in sym
    thr, back = (0.01, 0.003) if tight else (0.03, 0.01)
    v = [r[1] for r in rows]; bad = set()
    for i in range(1, len(v) - 1):
        r1, r2 = math.log(v[i] / v[i - 1]), math.log(v[i + 1] / v[i])
        if abs(r1) > thr and abs(r2) > thr and (r1 > 0) != (r2 > 0) and abs(r1 + r2) < back: bad.add(i)
    rows = [r for i, r in enumerate(rows) if i not in bad]
    brk = [0]
    for i in range(1, len(rows)): brk.append(brk[-1] + (1 if (D(rows[i][0]) - D(rows[i - 1][0])).days > 10 else 0))
    return [r[0] for r in rows], [r[1] for r in rows], brk

def F_series(dates, val, brk, w=63, zt=1.0, look=126, sdN=756, back=0.5):
    n = len(val); ok = lambda i, k: i - k >= 0 and brk[i] == brk[i - k]
    lr = [math.log(val[i] / val[i - w]) if ok(i, w) else None for i in range(n)]
    sd = [None] * n; z = [None] * n; F = [None] * n
    for i in range(n):
        lo = max(0, i - sdN + 1)
        win = [x for x in lr[lo:i + 1] if x is not None]
        if len(win) >= 0.9 * sdN and (D(dates[i]) - D(dates[lo])).days <= 1278:
            sd[i] = statistics.stdev(win)
        if sd[i] and lr[i] is not None: z[i] = lr[i] / sd[i]
    for i in range(n):
        if sd[i] is None or i - look + 1 < 0 or not ok(i, w - 1): continue
        zs = [x for x in z[i - look + 1:i + 1] if x is not None]
        if len(zs) < 0.9 * look: continue
        mx = max(val[i - w + 1:i + 1])
        F[i] = 1 if any(x >= zt for x in zs) and math.log(mx / val[i]) >= back * sd[i] else 0
    return F

def D_series(dates, val, ma=200, w=63):
    n = len(val); brk = [0]
    for i in range(1, n): brk.append(brk[-1] + (1 if (D(dates[i]) - D(dates[i - 1])).days > 10 else 0))
    out = [None] * n
    for i in range(n):
        k = max(ma - 1, w)
        if i - k < 0 or brk[i] != brk[i - k]: continue
        sma = sum(val[i - ma + 1:i + 1]) / ma
        out[i] = 1 if val[i] < sma and val[i] < val[i - w] else 0
    return out

def tuesday_after(d):  # martedì della settimana dopo quella del giorno d (H.10 esce il lunedì)
    x = D(d); to_mon = ((7 - x.weekday()) % 7) or 7
    return (x + timedelta(days=to_mon + 1)).isoformat()

def published(fd, fv, idx_dates):
    av = [tuesday_after(d) for d in fd]; out = []; j = -1
    for d in idx_dates:
        while j + 1 < len(av) and av[j + 1] <= d: j += 1
        out.append(fv[j] if j >= 0 and (D(d) - D(fd[j])).days <= 21 else None)
    return out

def episodes(close):
    eps = []; pk = lo = 0; inep = False
    for t in range(1, len(close)):
        c = close[t]
        if c is None: continue
        if c >= close[pk]:
            if inep and close[lo] / close[pk] - 1 <= -0.25: eps.append((pk, lo, True))
            pk = lo = t; inep = False; continue
        inep = True
        if c < close[lo]: lo = t
    if inep and close[lo] / close[pk] - 1 <= -0.25: eps.append((pk, lo, False))
    return eps

CCY = {'CSI300': 'CNY=X', 'NIFTY50': 'INR=X', 'IBOV': 'BRL=X', 'KOSPI200': 'KRW=X', 'TWN': 'TWD=X'}
fred = json.load(open(f'{CACHE}/DTWEXEMEGS.json'))['rows']
fd, fv = [r[0] for r in fred], [r[1] for r in fred]
Dfred = D_series(fd, fv)
antF, dopoD, righe = [], [], []
for k in ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM']:
    dates, close = index_close(k)
    Fi = None
    if k in CCY:
        cd, cv, brk = clean(CCY[k], fx_rows(CCY[k]))
        m = dict(zip(cd, F_series(cd, cv, brk)))
        Fi = [m.get(d) for d in dates]
    Di = published(fd, Dfred, dates)
    for pk, t0, rec in episodes(close):
        a, b = max(1, t0 - 126), min(len(dates) - 1, t0 + 126)
        aF = None
        if Fi is not None and any(x is not None for x in Fi[a:b + 1]):
            for t in range(a, b + 1):
                if Fi[t] == 1 and Fi[t - 1] != 1: aF = t - t0; break
            antF.append(aF)
        dD = None
        if Di[t0] is not None:
            for t in range(t0, min(len(dates) - 1, t0 + 252) + 1):
                if Di[t] == 1: dD = t - t0; break
            if dD is not None: dopoD.append(dD)
        dd = (close[t0] / close[pk] - 1) * 100
        righe.append(f'{k:9} minimo {dates[t0]} dd {dd:6.1f}% {"" if rec else "(in corso, ultima seduta " + dates[-1] + ")"} F prima accensione {aF} | D dopo {dD}')
print('\n'.join(righe))
nn=[x for x in antF if x is not None]
print(f'\nF: episodi con dati di F nella finestra ±126: {len(antF)}; prima accensione prima del minimo {sum(x < 0 for x in nn)}, dopo {sum(x >= 0 for x in nn)}, mai accesa nella finestra {antF.count(None)}; mediana {statistics.median(nn)}')
print(f'D: prima accensione dal minimo (entro 252): {len(dopoD)} episodi, mediana {statistics.median(dopoD)} sedute')

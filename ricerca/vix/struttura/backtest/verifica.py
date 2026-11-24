"""Ricalcolo indipendente dei numeri chiave di backtest.mjs (struttura a termine e credito).

Scritto da zero in Python (solo libreria standard), senza importare js/vix.js né riusare backtest.mjs:
- decodifica data/vix.json da sé (date = d0 + intervalli in base 36, valori = somme cumulative di interi / ps);
- legge i CSV di FRED in cache/ (VXVCLS, BAA10Y); un valore vuoto resta mancante;
- episodio VIX alla soglia X: si tiene il conteggio delle chiusure consecutive < X; inizio = VIX >= X con almeno 63
  chiusure < X subito prima (altra implementazione della stessa definizione);
- ingresso alla chiusura della seduta dopo il segnale; rendimento a 63 e 252 sedute; calo = min(0, minimo delle chiusure
  da ingresso a ingresso+252 / ingresso - 1), solo con la finestra completa;
- Q1: classificazione «con backwardation» (R >= 1 dal segnale a 5 sedute dopo), confronto a livello di sedute dal 2008;
- Q2: eventi «uscita dalla backwardation» (K = 5, s = 1, Q = 63), minimo già fatto, uscite false, coppia con VIX >= 30;
- Q3: credito in tensione (variazione di BAA10Y su 21 sedute >= 0,30; percentile sulla storia FRED fino al giorno >= 80).
Confronta con risultati.json (tolleranza 0,01) e stampa ogni differenza.

Uso: python3 -I ricerca/vix/struttura/backtest/verifica.py
"""
import bisect
import json
import os
import statistics as st
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
RES = json.load(open(os.path.join(HERE, 'risultati.json')))
RAW = json.load(open(os.path.join(ROOT, 'data', 'vix.json')))['series']


def decode(x):
    t = date.fromisoformat(x['d0'])
    ds = [x['d0']]
    for ch in x['gaps']:
        t += timedelta(days=int(ch, 36))
        ds.append(t.isoformat())
    vals, acc = [], None
    for r in x['cd']:
        if r is None:
            acc = None
            vals.append(None)
            continue
        acc = r if acc is None else acc + r
        vals.append(acc / (x.get('ps') or 1))
    return ds, vals


def csv(name):
    out = {}
    with open(os.path.join(HERE, 'cache', name + '.csv')) as f:
        next(f)
        for line in f:
            d, v = line.strip().split(',')
            out[d] = float(v) if v not in ('', '.') else None
    return out


VXV, BAA = csv('VXVCLS'), csv('BAA10Y')
# percentile di BAA10Y: quota dei valori <= x sulla storia FRED fino a quel giorno
baa_pct, seen = {}, []
for d in sorted(BAA):
    v = BAA[d]
    if v is None:
        continue
    bisect.insort(seen, v)
    baa_pct[d] = 100 * bisect.bisect_right(seen, v) / len(seen)
vdates, vvals = decode(RAW['VIX'])
VIX = dict(zip(vdates, vvals))

diffs, checks = [], 0


def check(label, mine, theirs, tol=0.01):
    global checks
    checks += 1
    if mine is None or theirs is None:
        ok = mine is None and theirs is None
    elif isinstance(mine, (str, bool)):
        ok = mine == theirs
    else:
        ok = abs(mine - theirs) <= tol
    if not ok:
        diffs.append((label, mine, theirs))


def med(a):
    a = [x for x in a if x is not None]
    return st.median(a) if a else None


for key in ('SPX', 'NDX'):
    R0 = RES[key]
    dates, close = decode(RAW[key])
    n = len(dates)
    vix = [VIX.get(d) for d in dates]
    vxv = [VXV.get(d) for d in dates]
    baa = [BAA.get(d) for d in dates]
    R = [v / w if v is not None and w is not None else None for v, w in zip(vix, vxv)]

    def ret(p, h, entry=1):
        e = p + entry
        return (close[e + h] / close[e] - 1) * 100 if e + h < n else None

    def dd(p, entry=1):
        e = p + entry
        if e + 252 >= n:
            return None
        return min(0.0, (min(close[e:e + 253]) / close[e] - 1) * 100)

    def grp(ps):
        r252 = [ret(p, 252) for p in ps]
        r252 = [x for x in r252 if x is not None]
        dds = [x for x in (dd(p) for p in ps) if x is not None]
        return {'n': len(ps), 'full': len(r252), 'med': med(r252), 'posN': sum(1 for x in r252 if x > 0), 'dd': med(dds)}

    def check_grp(label, mine, s):
        check(label + ' n', mine['n'], s['n'])
        check(label + ' full', mine['full'], s['full'])
        check(label + ' med252', mine['med'], s['252']['median'])
        check(label + ' pos252', mine['posN'], s['252']['posN'])
        check(label + ' dd', mine['dd'], s['dd']['median'])

    # ---- copertura e quota di backwardation (dal 2007-12-04) ----
    i0 = next(i for i, d in enumerate(dates) if d >= '2007-12-04')
    rr = [x for x in R[i0:] if x is not None]
    on = sum(1 for x in rr if x >= 1)
    runs = sum(1 for j, x in enumerate(rr) if x >= 1 and (j == 0 or rr[j - 1] < 1))
    check(key + ' sedute in backwardation', on, R0['q1']['backwardation']['on'])
    check(key + ' tratti di backwardation', runs, R0['q1']['backwardation']['runs'])

    # ---- episodi VIX (altra implementazione) ----
    def episodes(X, Q=63):
        out, below = [], 0
        for p in range(n):
            v = vix[p]
            if v is None:
                continue
            if v >= X:
                if below >= Q:
                    out.append(p)
                below = 0
            else:
                below += 1
        return out

    # ---- Q1 ----
    s0 = [p for p in range(n) if dates[p] >= '2008-01-01' and p + 1 < n]
    check_grp(key + ' Q1 sedute base', grp(s0), R0['q1']['sessions']['base'])
    check_grp(key + ' Q1 sedute R>=1', grp([p for p in s0 if R[p] is not None and R[p] >= 1]), R0['q1']['sessions']['R1'])
    check_grp(key + ' Q1 sedute VIX>=30', grp([p for p in s0 if vix[p] is not None and vix[p] >= 30]), R0['q1']['sessions']['vix30'])
    for X in (20, 25, 30, 40):
        eps = [p for p in episodes(X) if dates[p] >= '2008-01-01']
        con = [p for p in eps if any(R[i] is not None and R[i] >= 1 for i in range(p, min(n, p + 6)))]
        senza = [p for p in eps if p not in con]
        v = R0['q1']['thresholds'][str(X)]['variants']['main']
        check(f'{key} Q1 VIX{X} episodi', len(eps), R0['q1']['thresholds'][str(X)]['n'])
        check_grp(f'{key} Q1 VIX{X} con', grp(con), v['A'])
        check_grp(f'{key} Q1 VIX{X} senza', grp(senza), v['B'])
        r1 = [p for p in eps if R[p] is not None and R[p] >= 1]
        check(f'{key} Q1 VIX{X} con (solo segnale)', len(r1), R0['q1']['thresholds'][str(X)]['variants']['v1_segnale']['A']['n'])

    # ---- Q2: uscite dalla backwardation (K = 5, s = 1, Q = 63) ----
    pos = [p for p in range(n) if R[p] is not None]
    events = []
    contango, in_ep, run, done = 0, False, 0, False
    for j, p in enumerate(pos):
        x = R[p]
        if x >= 1:
            if contango >= 63:  # nuovo episodio di backwardation
                in_ep, run, done, start = True, 0, False, p
            contango = 0
            run += 1
        else:
            if in_ep and not done and run >= 5:
                events.append((start, p))
                done = True
            run = 0
            contango += 1
    mine = R0['q2']['variants']['main']['events']
    check(key + ' Q2 numero eventi', len(events), len(mine))
    eps30 = episodes(30)
    for (start, p), e in zip(events, mine):
        lab = f'{key} Q2 {dates[p]}'
        check(lab + ' data', dates[p], e['date'])
        check(lab + ' inizio', dates[start], e['start'])
        for h in (21, 63, 126, 252):
            check(lab + f' rend {h}', ret(p, h), e['ret'][str(h)])
        ent = p + 1
        lo = min(close[ent:ent + 253])
        check(lab + ' calo', min(0.0, (lo / close[ent] - 1) * 100) if ent + 252 < n else None, e['dd'] if not e['partial'] else None)
        before = min(close[start:p + 1])
        full = ent + 252 < n
        bottom = None if (not full and lo >= before) else lo >= before
        check(lab + ' minimo già fatto', bottom, e['bottomDone'])
        rebw = any(R[i] is not None and R[i] >= 1 for i in range(p + 1, min(n, p + 22)))
        fake = True if (rebw and lo < before) else (False if (not rebw or full) else None)
        check(lab + ' uscita falsa', fake, e['fake'])
    # coppie con l'episodio VIX >= 30 della stessa crisi (etichetta o sovrapposizione) — si rifà l'etichetta da CRISES
    pairs = R0['q2']['variants']['main']['vsVix']['30']['list']
    for pr in pairs:
        q = dates.index(pr['vixSignal'])
        check(f'{key} Q2 coppia {pr["event"]} è un episodio VIX30', q in eps30, True)
        check(f'{key} Q2 coppia {pr["event"]} rend VIX30', ret(q, 252), pr['vx252'])

    # ---- Q3 ----
    for X in (25, 30):
        eps = episodes(X)
        def d21(p):
            return baa[p] - baa[p - 21] if p >= 21 and baa[p] is not None and baa[p - 21] is not None else None
        ten = [p for p in eps if d21(p) is not None and d21(p) >= 0.3 - 1e-9]
        no = [p for p in eps if d21(p) is not None and d21(p) < 0.3 - 1e-9]
        v = R0['q3'][str(X)]['variants']
        check(f'{key} Q3 VIX{X} episodi', len(eps), R0['q3'][str(X)]['n'])
        check_grp(f'{key} Q3 VIX{X} tensione', grp(ten), v['main']['A'])
        check_grp(f'{key} Q3 VIX{X} no', grp(no), v['main']['B'])
        ten = [p for p in eps if baa_pct.get(dates[p]) is not None and baa_pct[dates[p]] >= 80]
        no = [p for p in eps if baa_pct.get(dates[p]) is not None and baa_pct[dates[p]] < 80]
        check_grp(f'{key} Q3 VIX{X} pct80 tensione', grp(ten), v['pct80']['A'])
        check_grp(f'{key} Q3 VIX{X} pct80 no', grp(no), v['pct80']['B'])
        worst = [x for x in (dd(p) for p in ten) if x is not None]
        check(f'{key} Q3 VIX{X} pct80 calo peggiore', min(worst) if worst else None, v['pct80']['A']['dd']['worst'])

print(f'controlli: {checks}, differenze: {len(diffs)}')
for d in diffs:
    print('  DIFF', *d)

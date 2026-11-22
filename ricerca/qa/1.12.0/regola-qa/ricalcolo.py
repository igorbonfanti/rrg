#!/usr/bin/env python3
"""
QA indipendente 1.12.0, regola del calo «in corso» della linea del tempo dei massimi (vista 0 Massimi).

Scritto da zero: non importa e non traduce js/peaks.js. Legge data/ath_history.json (serie SPX), decodifica
d0 + gaps (base 36, un carattere per seduta) e cd (differenze intere cumulate) / ps (assente = 100), poi per ogni
taglio (chiusure <= data del taglio) applica la regola come è scritta nel compito e nella guida:

  - massimo di 52 settimane: chiusura più alta di tutte quelle dei 365 giorni di calendario prima (finestra
    [d-365, d)), con almeno 365 giorni di storia (d >= inizio serie + 365 giorni);
  - massimo di ciclo X%: massimo di 52 settimane dopo il quale il prezzo scende di almeno X% (chiusura <= c*(1-X/100))
    prima di una chiusura strettamente più alta;
  - recuperato: esiste una chiusura successiva strettamente più alta (nel taglio);
  - conclusi mostrati: gli ultimi 4 massimi di ciclo >= 15% recuperati; calo = chiusura più bassa dopo il massimo fino al
    recupero o al massimo di ciclo successivo (il primo massimo di ciclo con data successiva), se viene prima;
  - in corso: i massimi di ciclo >= 15% non recuperati, in ordine di data, calo = chiusura più bassa dopo il massimo
    fino all'ultima seduta; se non ce ne sono, l'ultimo massimo di 52 settimane non ancora superato (calo nullo se è
    l'ultima seduta).

Uso: python3 -I ricerca/qa/1.12.0/regola-qa/ricalcolo.py [file ath_history.json] > uscita.json
Scrive su stdout un JSON {taglio: {asOf, done:[[data, calo]], open:[[data, calo]], checks...}}.
"""
import json, sys, datetime as dt
from decimal import Decimal, ROUND_HALF_UP

PATH = sys.argv[1] if len(sys.argv) > 1 else 'data/ath_history.json'
H = json.load(open(PATH))
S = H['series']['SPX']

def decode(s):
    d = dt.date.fromisoformat(s['d0'])
    dates = [d]
    for ch in s['gaps']:
        d = d + dt.timedelta(days=int(ch, 36))
        dates.append(d)
    ps = s.get('ps', 100) or 100
    acc, close = None, []
    for v in s['cd']:
        if v is None:
            acc = None; close.append(None); continue
        acc = v if acc is None else acc + v
        close.append(acc / ps)
    assert len(dates) == len(close), (len(dates), len(close))
    out = [(a, b) for a, b in zip(dates, close) if b is not None]
    return [a for a, _ in out], [b for _, b in out]

DATES, CLOSE = decode(S)

def r1(x):
    # arrotondamento «metà verso l'alto» a 0,1 come Math.round(x*10)/10 di JS (verso +infinito)
    return float(Decimal(repr(x * 10)).quantize(Decimal('1'), rounding=ROUND_HALF_UP) / 10) if x is not None else None

def r1js(x):
    import math
    return None if x is None else math.floor(x * 10 + 0.5) / 10

def analyse(dates, close, X=15, last=4):
    n = len(close)
    first = dates[0]
    # massimi di 52 settimane, forza bruta O(n * 260)
    hi52 = []
    lo = 0
    for i in range(n):
        if dates[i] < first + dt.timedelta(days=365):
            continue
        lim = dates[i] - dt.timedelta(days=365)
        prev = [close[k] for k in range(i - 1, -1, -1) if dates[k] >= lim] if False else None
        # finestra [d-365, d)
        k = i - 1; m = None
        while k >= 0 and dates[k] >= lim:
            m = close[k] if m is None or close[k] > m else m
            k -= 1
        if m is not None and close[i] > m:
            hi52.append(i)
    def nxt_higher(i):
        for k in range(i + 1, n):
            if close[k] > close[i]:
                return k
        return None
    cyc = []
    for i in hi52:
        j = nxt_higher(i)
        end = n if j is None else j
        conf = next((k for k in range(i + 1, end) if close[k] <= close[i] * (1 - X / 100)), None)
        if conf is not None:
            cyc.append({'i': i, 'j': j, 'conf': conf})
    for t, p in enumerate(cyc):
        nx = cyc[t + 1]['i'] if t + 1 < len(cyc) else None
        end = min(x for x in [p['j'], nx, n] if x is not None)
        seg = close[p['i'] + 1:end]
        p['dd_raw'] = (min(seg) / close[p['i']] - 1) * 100 if seg else None
        # calo fino all'ultima seduta (per gli aperti)
        seg2 = close[p['i'] + 1:]
        p['dd_open'] = (min(seg2) / close[p['i']] - 1) * 100 if seg2 else None
    done = [p for p in cyc if p['j'] is not None][-last:]
    opn = [p for p in cyc if p['j'] is None]
    if opn:
        open_rows = [(dates[p['i']].isoformat(), r1js(p['dd_open']), p['dd_open']) for p in opn]
        src = 'ciclo'
    else:
        cand = [i for i in hi52 if nxt_higher(i) is None]
        if cand:
            i = cand[-1]; seg = close[i + 1:]
            ddo = (min(seg) / close[i] - 1) * 100 if seg else None
            open_rows = [(dates[i].isoformat(), r1js(ddo), ddo)]
        else:
            open_rows = []
        src = '52w'
    # controlli 2 (indipendenti dalla regola): record «mai superati dopo» con calo successivo >= 15%
    suffix_rec = []
    best = None
    for i in range(n - 1, -1, -1):
        if best is None or close[i] > best:
            # nessuna chiusura successiva strettamente più alta
            seg = close[i + 1:]
            dd = (min(seg) / close[i] - 1) * 100 if seg else None
            if dd is not None and dd <= -15:
                suffix_rec.append((dates[i].isoformat(), dd, i in set(hi52)))
            best = close[i] if best is None or close[i] > best else best
    return {
        'asOf': dates[-1].isoformat(),
        'done': [[dates[p['i']].isoformat(), r1js(p['dd_raw'])] for p in done],
        'done_raw': [p['dd_raw'] for p in done],
        'open': [[a, b] for a, b, _ in open_rows],
        'open_raw': [c for _, _, c in open_rows],
        'open_src': src,
        'unrecovered15': suffix_rec[::-1],
        'cycles_all': [[dates[p['i']].isoformat(), p['j'] is not None] for p in cyc],
    }

def cuts():
    today = DATES[-1]
    out = []
    y, m = 2002, 1
    while dt.date(y, m, 1) <= today:
        ny, nm = (y + 1, 1) if m == 12 else (y, m + 1)
        out.append((dt.date(ny, nm, 1) - dt.timedelta(days=1)).isoformat())
        y, m = ny, nm
    out += ['2008-03-31', '2009-03-09', '2010-06-30', '2011-10-03', '2012-03-30', '2013-03-27', '2013-03-28', '2020-03-23',
            '2022-10-12', '2023-07-31', '2023-12-29', '2024-01-19', '2025-04-08', '2026-10-06', today.isoformat()]
    return sorted(set(out))

res = {}
for c in cuts():
    cd = dt.date.fromisoformat(c)
    k = sum(1 for d in DATES if d <= cd)
    if k == 0:
        continue
    res[c] = analyse(DATES[:k], CLOSE[:k])
json.dump(res, sys.stdout, indent=0)

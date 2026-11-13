#!/usr/bin/env python3
"""Controllo indipendente 1.10.1: riga del pannello «Distanza dal massimo degli ultimi 3 anni» per oro (GC=F) e
argento (SI=F), ricalcolata da Yahoo con codice proprio (solo libreria standard, nessun import dall'app).

Regole (dalla nota del pannello e da data/ath.json.method):
- ultima seduta = ultima barra giornaliera chiusa (data di New York < oggi a New York, chiusura non nulla);
- finestra = dalla stessa data di 3 anni prima dell'ultima seduta;
- riferimento = massimo di chiusura nella finestra (a pari valore la prima data);
- distanza = ultima / riferimento - 1; giorni = giorni di calendario dal riferimento all'ultima seduta;
- calo più profondo = minimo di chiusura dal giorno del massimo in poi;
- massimo nella seduta = massimo dei massimi nella finestra; massimo di sempre = massimo di chiusura di tutta la serie.

Uso: python3 -I ricerca/qa/1.10.1/ricalcolo.py <cartella-cache> [data/ath.json]
Scrive ricerca/qa/1.10.1/ricalcolo.json.
"""
import json, os, sys, urllib.request, datetime as dt
from zoneinfo import ZoneInfo

NY = ZoneInfo('America/New_York')
SYMS = ['GC=F', 'SI=F', 'GLD', 'SLV']
cache = sys.argv[1]
ath_path = sys.argv[2] if len(sys.argv) > 2 else 'data/ath.json'
os.makedirs(cache, exist_ok=True)


def get(sym):
    f = os.path.join(cache, sym.replace('=', '_') + '.json')
    if not os.path.exists(f):
        url = f'https://query2.finance.yahoo.com/v8/finance/chart/{sym}?period1=0&period2=9999999999&interval=1d'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as r, open(f, 'wb') as o:
            o.write(r.read())
    return json.load(open(f))['chart']['result'][0]


def bars(res):
    q = res['indicators']['quote'][0]
    today = dt.datetime.now(NY).date()
    out = {}
    for t, c, h in zip(res['timestamp'], q['close'], q['high']):
        d = dt.datetime.fromtimestamp(t, NY).date()
        if c is None or d >= today:
            continue
        out[d] = (c, h if h is not None else c)
    return sorted((d, c, h) for d, (c, h) in out.items())


def minus3y(d):
    try:
        return d.replace(year=d.year - 3)
    except ValueError:
        return d.replace(year=d.year - 3, day=28)


def row(b):
    last_d, last_c, _ = b[-1]
    frm = minus3y(last_d)
    w = [x for x in b if x[0] >= frm]
    ref_d, ref_c = None, -1
    for d, c, _ in w:
        if c > ref_c:
            ref_d, ref_c = d, c
    after = [x for x in w if x[0] >= ref_d]
    lo = min(after, key=lambda x: (x[1], x[0]))
    ih = max(w, key=lambda x: (x[2], -x[0].toordinal()))
    ath = max(b, key=lambda x: (x[1], -x[0].toordinal()))
    r2 = lambda v: round(v * 100, 2)
    return dict(start=str(b[0][0]), frm=str(frm), last=last_c, lastDate=str(last_d), ref=ref_c, refDate=str(ref_d),
                distPct=r2(last_c / ref_c - 1), days=(last_d - ref_d).days, cycleLow=lo[1], cycleLowDate=str(lo[0]),
                cycleLowPct=r2(lo[1] / ref_c - 1), fromLowPct=r2(last_c / lo[1] - 1), intradayRef=ih[2],
                intradayRefDate=str(ih[0]), ath=ath[1], athDate=str(ath[0]))


app = {m['symbol']: m.get('stats') for m in json.load(open(ath_path))['markets']}
res = {}
for s in SYMS:
    r = row(bars(get(s)))
    res[s] = r
    a = app.get(s)
    print(f'\n{s}: {json.dumps(r)}')
    if a:
        diffs = []
        for k in ['lastDate', 'refDate', 'distPct', 'days', 'cycleLowDate', 'cycleLowPct', 'fromLowPct', 'intradayRefDate', 'athDate']:
            if a.get(k) != r[k]:
                diffs.append((k, a.get(k), r[k]))
        for k in ['last', 'ref', 'cycleLow', 'intradayRef', 'ath']:
            if abs(a[k] - r[k]) > 1e-3:
                diffs.append((k, a[k], r[k]))
        print('  data/ath.json:', 'coincide (14 campi)' if not diffs else f'DIVERSO {diffs}')

# barre attorno al massimo dell'argento e confronto SLV
si = {d: c for d, c, _ in bars(get('SI=F'))}
slv = {d: c for d, c, _ in bars(get('SLV'))}
print('\nSI=F / SLV dal 22/01 al 30/01/2026:')
for d in sorted(si):
    if dt.date(2026, 1, 22) <= d <= dt.date(2026, 1, 30):
        print(' ', d, si[d], slv.get(d))
json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ricalcolo.json'), 'w'), indent=1)

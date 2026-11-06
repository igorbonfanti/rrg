#!/usr/bin/env python3
"""ricontrollo.py — ricalcolo indipendente (Python, senza il codice dell'app né di verifica_dati.mjs) dei numeri chiave
della verifica dei dati del VIX. Legge gli stessi file grezzi di ricerca/vix/cache/inserimento/.
Date di Yahoo: dal timestamp della barra nel fuso della borsa (zoneinfo), non con parse() di scripts/lib/yahoo.js.
Uso: python3 -I ricerca/vix/inserimento/ricontrollo.py
"""
import csv, json, os, statistics
from datetime import datetime
from zoneinfo import ZoneInfo

C = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cache', 'inserimento')

def fred(name):
    out = {}
    with open(os.path.join(C, name)) as f:
        for row in list(csv.reader(f))[1:]:
            if len(row) == 2 and row[1] not in ('', '.'):
                out[row[0]] = float(row[1])
    return out

def cboe(name):
    out = {}
    with open(os.path.join(C, name)) as f:
        for row in list(csv.reader(f))[1:]:
            m, d, y = row[0].split('/')
            out[f'{y}-{int(m):02d}-{int(d):02d}'] = float(row[4])
    return out

def yahoo(name, drop_after=None):
    j = json.load(open(os.path.join(C, name)))['chart']['result'][0]
    tz = ZoneInfo(j['meta']['exchangeTimezoneName'])
    out = {}
    for t, c in zip(j['timestamp'], j['indicators']['quote'][0]['close']):
        if c is None:
            continue
        out[datetime.fromtimestamp(t, tz).strftime('%Y-%m-%d')] = c
    if drop_after:  # barra della seduta in corso al momento del download
        out = {d: v for d, v in out.items() if d <= drop_after}
    return out

fv, fn = fred('fred_VIXCLS.csv'), fred('fred_VXNCLS.csv')
bv, bn = cboe('cboe_VIX.csv'), cboe('cboe_VXN.csv')
yv, yn = yahoo('yahoo_VIX_1d.json', '2026-11-05'), yahoo('yahoo_VXN_1d.json', '2026-11-05')
gs = yahoo('yahoo_GSPC_1d.json', '2026-11-05')
nyse = {d for d in gs if d >= '1990-01-02'}

def diff(a, b, t):
    return sum(1 for d in a if d in b and abs(a[d] - b[d]) > t)

print('sedute NYSE (^GSPC) dal 1990:', len(nyse))
print('VIX FRED-Cboe: comuni', sum(1 for d in fv if d in bv), 'diverse >0,005:', diff(fv, bv, 0.005))
print('VXN FRED-Cboe: comuni', sum(1 for d in fn if d in bn), 'diverse >0,005:', diff(fn, bn, 0.005))
print('VIX Yahoo-Cboe: comuni', sum(1 for d in yv if d in bv), '>0,005:', diff(yv, bv, 0.005), '>0,5:', diff(yv, bv, 0.5))
print('VXN Yahoo-FRED >0,5:', diff(yn, fn, 0.5), 'di cui prima del 2004:', sum(1 for d in yn if d in fn and d < '2004' and abs(yn[d] - fn[d]) > 0.5))
print('Cboe VIX in giorni senza NYSE:', len([d for d in bv if d not in nyse]), 'dal 2022:', len([d for d in bv if d not in nyse and d >= '2022']))
print('sedute NYSE senza VIX Cboe:', sorted(d for d in nyse if d not in bv and d <= '2026-11-05'))
print('sedute NYSE senza VIX FRED:', sorted(d for d in nyse if d not in fv and d <= max(fv)))
for L in (20, 25, 30, 40, 50):
    print(f'chiusure >= {L}: Cboe', sum(1 for v in bv.values() if v >= L), 'Yahoo', sum(1 for v in yv.values() if v >= L))
# 16:00 contro 16:15: chiusura della barra a 5 minuti delle 15:55 ET contro la chiusura ufficiale di Cboe
j = json.load(open(os.path.join(C, 'yahoo_VIX_5m_60d.json')))['chart']['result'][0]
ny = ZoneInfo('America/New_York')
at16 = {}
for t, c in zip(j['timestamp'], j['indicators']['quote'][0]['close']):
    dt = datetime.fromtimestamp(t, ny)
    if c is not None and dt.strftime('%H:%M') == '15:55':
        at16[dt.strftime('%Y-%m-%d')] = c
d = [abs(bv[k] - v) for k, v in at16.items() if k in bv and k in gs]
print('16:15 contro 16:00: giorni', len(d), 'mediana', round(statistics.median(d), 3), 'max', round(max(d), 2), '>0,5:', sum(1 for x in d if x > 0.5))

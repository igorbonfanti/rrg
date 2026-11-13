"""Anomalie nella finestra dei 3 anni (dati di Yahoo salvati da verifica_ath.py): salti > 10%, chiusure ripetute 3+ volte,
buchi di calendario > 5 giorni (BTC > 1). Uso: python3 -I ricerca/qa/1.10.0/numeri/anomalie.py"""
import json, os, datetime as dt
from zoneinfo import ZoneInfo
HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, 'ricalcolo.json')))
cfg = json.load(open(os.path.join(HERE, '..', '..', '..', '..', 'config', 'ath.json')))['markets']
for c in cfg:
    j = json.load(open(os.path.join(HERE, 'cache', 'Y_' + c['symbol'].replace('^', '_').replace('=', '_') + '.json')))['chart']['result'][0]
    tz = ZoneInfo(j['meta']['exchangeTimezoneName']); q = j['indicators']['quote'][0]
    b = [(dt.datetime.fromtimestamp(t, tz).date(), q['close'][i]) for i, t in enumerate(j['timestamp']) if q['close'][i] is not None]
    frm = dt.date.fromisoformat(R[c['id']]['from']); last = dt.date.fromisoformat(R[c['id']]['lastDate'])
    b = [x for x in b if frm <= x[0] <= last]
    out = []
    for (d0, c0), (d1, c1) in zip(b, b[1:]):
        if abs(c1 / c0 - 1) > 0.10: out.append(f'salto {d0}->{d1} {100*(c1/c0-1):+.1f}%')
        g = (d1 - d0).days
        if g > (1 if c['id'] == 'BTC' else 5): out.append(f'buco {d0}->{d1} ({g} giorni)')
    run = 1
    for (d0, c0), (d1, c1) in zip(b, b[1:]):
        run = run + 1 if c1 == c0 else 1
        if run == 3: out.append(f'chiusura ripetuta {c1} fino al {d1}')
    print(f"{c['id']:7s} {len(b)} sedute nella finestra: " + ('; '.join(out) if out else 'nessuna anomalia'))

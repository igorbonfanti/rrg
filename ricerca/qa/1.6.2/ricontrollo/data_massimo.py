"""Ricontrollo 1.6.2: data del VIX massimo di ogni episodio, ricalcolata senza js/vix.js.

Uso: python3 -I data_massimo.py <fred_vixcls.csv> <yahoo_gspc.json> <yahoo_ndx.json> <out.json>
- VIX: https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS
- indici: https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=631152000&period2=1794000000&interval=1d (e %5ENDX)
Regola (dalla nota della vista): calendario = sedute dell'indice, VIX di quel giorno se c'e'; episodio = prima chiusura
>= X preceduta da 63 chiusure valide < X; finisce all'ultima chiusura >= X prima dell'episodio successivo; massimo = chiusura
piu' alta >= X nell'episodio, data = la prima seduta con quel valore (se ci sono pari merito lo segnala).
Stampa anche: primi giorni degli episodi a 20/25 con il VIX gia' a 30 o piu', e quanti episodi hanno il massimo in un'altra
crisi (data del massimo a piu' di 252 sedute dall'inizio).
"""
import csv, json, sys, datetime
from zoneinfo import ZoneInfo

XS = [20, 25, 30, 40, 50]; Q = 63

def fred(path):
    m = {}
    for r in csv.DictReader(open(path)):
        v = r.get('VIXCLS', '')
        if v not in ('', '.'): m[r['observation_date']] = float(v)
    return m

def yahoo(path):
    j = json.load(open(path))['chart']['result'][0]
    tz = ZoneInfo(j['meta'].get('exchangeTimezoneName', 'America/New_York'))
    d = {}
    for t, c in zip(j['timestamp'], j['indicators']['quote'][0]['close']):
        if c is not None: d[datetime.datetime.fromtimestamp(t, tz).date().isoformat()] = c
    return sorted(k for k in d if k >= '1990-01-01')

def episodes(dates, F):
    pairs = [(d, F[d]) for d in dates if d in F]
    v = [x for _, x in pairs]; dd = [d for d, _ in pairs]
    out = {}
    for X in XS:
        st = [j for j in range(Q, len(v)) if v[j] >= X and all(v[k] < X for k in range(j - Q, j))]
        eps = []
        for e, j in enumerate(st):
            stop = st[e + 1] if e + 1 < len(st) else len(v)
            ab = [k for k in range(j, stop) if v[k] >= X]
            mx = max(v[k] for k in ab); at = [k for k in ab if v[k] == mx]
            eps.append({'date': dd[j], 'vix': v[j], 'vixMax': mx, 'maxDate': dd[at[0]], 'tie': [dd[k] for k in at[1:]],
                        'end': dd[ab[-1]], 'sedute_al_max': at[0] - j})
        out[X] = eps
    return out

def main(fv, yg, yn, out):
    F = fred(fv); R = {'fred_last': max(F)}
    for k, p in (('SPX', yg), ('NDX', yn)):
        R[k] = episodes(yahoo(p), F)
    json.dump(R, open(out, 'w'), indent=1)
    for k in ('SPX', 'NDX'):
        for X in XS:
            E = R[k][X]
            print(k, X, len(E), 'episodi; pari merito:', [(e['date'], e['tie']) for e in E if e['tie']],
                  '; primo giorno gia >=30:', [(e['date'], e['vix']) for e in E if X < 30 and e['vix'] >= 30],
                  '; massimo dopo 252 sedute:', [(e['date'], e['maxDate'], e['vixMax']) for e in E if e['sedute_al_max'] > 252])

if __name__ == '__main__':
    main(*sys.argv[1:5])

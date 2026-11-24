"""Ricalcolo indipendente (fase 3, 1.6.2) degli episodi del VIX, senza js/vix.js.

Uso: python3 -I ricalcolo_episodi.py <fred_vix.csv> <yahoo_gspc.json> <yahoo_ndx.json> <data/vix.json> <out.json>
- fred_vix.csv: https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS
- yahoo_*.json: https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=631152000&period2=1794000000&interval=1d
Due varianti: (A) VIX di FRED + indice di Yahoo scaricati ora; (B) VIX e indice decodificati da data/vix.json.
Regole: calendario = sedute dell'indice; VIX alla stessa data (null se manca); episodio = prima chiusura >= X preceduta da
>= 63 chiusure valide del VIX tutte < X; VIX max = max delle chiusure >= X fino all'episodio successivo; rendimenti da
close[p+1] a close[p+1+h], h in 21, 63, 126, 252; punti dello scatter = sedute con VIX >= 30 e p+1+252 < n.
"""
import csv, json, sys, datetime
from zoneinfo import ZoneInfo

XS = [20, 25, 30, 40, 50]; HS = [21, 63, 126, 252]; Q = 63

def fred(path):
    m = {}
    for r in csv.DictReader(open(path)):
        v = r.get('VIXCLS', '')
        if v not in ('', '.'): m[r['observation_date']] = float(v)
    return m

def yahoo(path):
    j = json.load(open(path))['chart']['result'][0]
    tz = ZoneInfo(j['meta'].get('exchangeTimezoneName', 'America/New_York'))
    out = []
    for t, c in zip(j['timestamp'], j['indicators']['quote'][0]['close']):
        if c is None: continue
        out.append((datetime.datetime.fromtimestamp(t, tz).date().isoformat(), c))
    d = {}
    for a, c in out: d[a] = c  # eventuali doppioni: l'ultimo
    ks = sorted(k for k in d if k >= '1990-01-01')
    return ks, [d[k] for k in ks]

def dec_dates(d0, gaps):
    t = datetime.date.fromisoformat(d0); out = [d0]
    for ch in gaps:
        t += datetime.timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out

def dec_vals(cd, ps):
    p = None; out = []
    for r in cd:
        if r is None: p = None; out.append(None); continue
        p = r if p is None else p + r; out.append(p / ps)
    return out

def series(x):
    return dec_dates(x['d0'], x['gaps']), dec_vals(x['cd'], x.get('ps', 1))

def compute(dates, close, vixmap):
    vix = [vixmap.get(d) for d in dates]
    pos = [i for i, v in enumerate(vix) if v is not None]
    v = [vix[i] for i in pos]; n = len(close)
    res = {}
    for X in XS:
        starts = [j for j in range(Q, len(v)) if v[j] >= X and all(v[k] < X for k in range(j - Q, j))]
        eps = []
        for e, j in enumerate(starts):
            stop = starts[e + 1] if e + 1 < len(starts) else len(v)
            above = [k for k in range(j, stop) if v[k] >= X]
            p = pos[j]; en = p + 1
            ret = {h: ((close[en + h] / close[en] - 1) * 100 if en + h < n else None) for h in HS}
            dd = None
            if en < n:
                end_ = min(n - 1, en + 252); dd = min(0.0, (min(close[en:end_ + 1]) / close[en] - 1) * 100)
            eps.append({'dd': dd, 'partial': en + 252 >= n, 'date': dates[p], 'vix': v[j], 'vixMax': max(v[k] for k in above), 'end': dates[pos[above[-1]]], 'ret': ret,
                        'n_above': len(above), 'span_sedute': above[-1] - j + 1})
        res[X] = eps
    pts = []
    for p, x in enumerate(vix):
        if x is None or x < 30 or p + 1 + 252 >= n: continue
        pts.append({'date': dates[p], 'vix': x, 'ret': (close[p + 253] / close[p + 1] - 1) * 100})
    return {'eps': res, 'pts': pts, 'last': dates[-1]}

def main(fv, yg, yn, vj, out):
    F = fred(fv); D = json.load(open(vj))['series']
    fd, fvv = series(D['VIX']); fileV = {d: x for d, x in zip(fd, fvv) if x is not None}
    R = {}
    for k, yp in (('SPX', yg), ('NDX', yn)):
        yd, yc = yahoo(yp)
        R['A_' + k] = compute(yd, yc, F)
        dd, cc = series(D[k])
        R['B_' + k] = compute(dd, cc, fileV)
        # differenze tra i calendari e tra le chiusure
        sy, sd = set(yd), set(dd)
        R['diff_' + k] = {'solo_yahoo': sorted(sy - sd)[:20], 'solo_file': sorted(sd - sy)[:20],
                          'n_yahoo': len(yd), 'n_file': len(dd)}
        ym = dict(zip(yd, yc)); worst = max(((abs(ym[d] / c - 1), d) for d, c in zip(dd, cc) if d in ym and c), default=None)
        R['diff_' + k]['max_rel_close_diff'] = worst
    vd = [(abs(F[d] - fileV[d]), d) for d in F if d in fileV]
    R['diff_VIX'] = {'max_abs': max(vd), 'solo_fred': sorted(set(F) - set(fileV))[:20], 'solo_file': sorted(set(fileV) - set(F))[:20], 'fred_last': max(F), 'file_last': max(fileV)}
    json.dump(R, open(out, 'w'), indent=1)

if __name__ == '__main__':
    main(*sys.argv[1:6])

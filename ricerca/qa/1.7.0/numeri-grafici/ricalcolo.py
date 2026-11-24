"""Ricalcolo indipendente (fase 3, 1.7.0, tema numeri e grafici) degli episodi del VIX, senza js/vix.js.

Uso: python3 -I ricalcolo.py <fred_vixcls.csv> <yahoo_gspc.json> <yahoo_ndx.json> <data/vix.json> <out.json>
- VIX: https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS
- indici: https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=631152000&period2=1794000000&interval=1d (e %5ENDX)
Due varianti:
  A = VIX di FRED sulle sedute di Yahoo (fonte indipendente; FRED non ha ancora l'ultima seduta provvisoria);
  B = VIX e indice decodificati da data/vix.json (decodifica scritta qui, dal formato descritto in js/indexdata.js).
Regola (dalla nota della vista e dalla richiesta): calendario = sedute dell'indice; VIX alla stessa data (manca = None);
episodio = prima chiusura >= X preceduta da almeno 63 chiusure valide del VIX tutte < X; continua fino al giorno prima
dell'inizio successivo; ultimo giorno = ultima chiusura >= X dell'episodio; massimo = chiusura piu' alta >= X (prima data);
sedute = sedute dell'indice dal primo all'ultimo giorno compresi; finito = almeno 63 chiusure valide del VIX dopo l'ultimo
giorno (tutte < X per costruzione). Mini-grafico atteso: dalla seduta p-63 alla seduta ultimo+21 (sedute dell'indice).
"""
import csv, json, sys, datetime
from zoneinfo import ZoneInfo

XS = [20, 25, 30, 40, 50]; Q = 63
CRISES = [  # etichette di periodo (le stesse della nota della vista)
    ['1990 Golfo', '1990-07-01', '1991-03-31'], ['1997 Asia', '1997-10-01', '1997-12-31'], ['1998 Russia/LTCM', '1998-08-01', '1998-12-31'],
    ['2000-03 bolla internet', '2000-03-01', '2003-04-30'], ['2007-09 crisi finanziaria', '2007-07-01', '2009-06-30'],
    ['2010 euro/flash crash', '2010-05-01', '2010-09-30'], ['2011-12 debito USA/euro', '2011-07-01', '2012-06-30'],
    ['2014 ottobre', '2014-10-01', '2014-12-31'], ['2015-16 Cina/petrolio', '2015-08-01', '2016-03-31'],
    ['2018 volatilità/Fed', '2018-02-01', '2018-12-31'], ['2020 Covid', '2020-02-01', '2020-12-31'],
    ['2022 inflazione/tassi', '2022-01-01', '2022-12-31'], ['2024 carry yen', '2024-07-15', '2024-09-30'],
    ['2025 dazi', '2025-03-01', '2025-05-31']]

def crisis(d):
    for n, a, b in CRISES:
        if a <= d <= b: return n
    return None

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
    ks = sorted(k for k in d if k >= '1990-01-01')
    return ks, [d[k] for k in ks]

def dec(x):
    t = datetime.date.fromisoformat(x['d0']); ds = [x['d0']]
    for ch in x['gaps']:
        t += datetime.timedelta(days=int(ch, 36)); ds.append(t.isoformat())
    ps = x.get('ps', 1); p = None; vs = []
    for r in x['cd']:
        if r is None: p = None; vs.append(None); continue
        p = r if p is None else p + r; vs.append(p / ps)
    assert len(ds) == len(vs)
    return ds, vs

def compute(dates, close, vmap):
    n = len(dates); vix = [vmap.get(d) for d in dates]
    valid = [i for i in range(n) if vix[i] is not None]
    out = {}
    for X in XS:
        starts = []
        for jj in range(Q, len(valid)):
            if vix[valid[jj]] >= X and all(vix[valid[k]] < X for k in range(jj - Q, jj)): starts.append(jj)
        eps = []
        for e, jj in enumerate(starts):
            stop = starts[e + 1] if e + 1 < len(starts) else len(valid)
            above = [valid[k] for k in range(jj, stop) if vix[valid[k]] >= X]
            p = valid[jj]; last = above[-1]
            mx = max(vix[i] for i in above); im = [i for i in above if vix[i] == mx][0]
            after_valid = sum(1 for i in range(last + 1, n) if vix[i] is not None)
            i0, i1 = max(0, p - 63), min(n - 1, last + 21)
            eps.append({'date': dates[p], 'p': p, 'vix': vix[p], 'vixMax': mx, 'maxDate': dates[im], 'maxP': im,
                        'end': dates[last], 'endP': last, 'sessions': last - p + 1, 'finished': after_valid >= 63,
                        'finished_by_index_sessions': (n - 1 - last) >= 63, 'crisis': crisis(dates[p]),
                        'above': [dates[i] for i in above], 'nullsInside': sum(1 for i in range(p, last + 1) if vix[i] is None),
                        'win': {'i0': i0, 'i1': i1, 'd0': dates[i0], 'd1': dates[i1], 'v0': vix[i0], 'v1': vix[i1],
                                'vals': vix[i0:i1 + 1], 'dates': dates[i0:i1 + 1]}})
        out[X] = eps
    return {'dates': dates, 'close': close, 'vix': vix, 'eps': out}

def main(fv, yg, yn, vj, outp):
    F = fred(fv); S = json.load(open(vj))['series']
    vd, vv = dec(S['VIX']); FV = {d: x for d, x in zip(vd, vv) if x is not None}
    R = {'fred_last': max(F), 'file_vix_last': vd[-1]}
    for k, yp in (('SPX', yg), ('NDX', yn)):
        yd, yc = yahoo(yp); fd, fc = dec(S[k])
        A = compute(yd, yc, F); B = compute(fd, fc, FV)
        R[k] = {'B': B, 'A_eps': A['eps'], 'cal': {'solo_yahoo': sorted(set(yd) - set(fd)), 'solo_file': sorted(set(fd) - set(yd)), 'n_yahoo': len(yd), 'n_file': len(fd)}}
        ym = dict(zip(yd, yc))
        R[k]['close_maxrel'] = max((abs(ym[d] / c - 1), d) for d, c in zip(fd, fc) if d in ym and c)
        # confronto A contro B episodio per episodio
        diffs = []
        for X in XS:
            a, b = A['eps'][X], B['eps'][X]
            if len(a) != len(b): diffs.append((X, 'numero', len(a), len(b)))
            for ea, eb in zip(a, b):
                for f in ('date', 'vix', 'vixMax', 'maxDate', 'end', 'sessions', 'finished'):
                    if ea[f] != eb[f]: diffs.append((X, ea['date'], f, ea[f], eb[f]))
        R[k]['diff_A_B'] = diffs
    vdiff = [(round(abs(F[d] - FV[d]), 4), d) for d in F if d in FV and abs(F[d] - FV[d]) > 1e-9]
    R['vix_file_vs_fred'] = {'n_diff': len(vdiff), 'max': max(vdiff) if vdiff else None, 'solo_file': sorted(set(FV) - set(F)), 'solo_fred': sorted(set(F) - set(FV))}
    json.dump(R, open(outp, 'w'))
    print('FRED ultimo', R['fred_last'], '· file ultimo', R['file_vix_last'], '· VIX file vs FRED', R['vix_file_vs_fred'])
    for k in ('SPX', 'NDX'):
        print(k, 'calendario', {a: (b if isinstance(b, int) else b[:8]) for a, b in R[k]['cal'].items()}, 'chiusure max diff rel', R[k]['close_maxrel'])
        print(k, 'differenze A (FRED+Yahoo) contro B (file):', R[k]['diff_A_B'] or 'nessuna')
        for X in XS:
            E = R[k]['B']['eps'][X]
            print(f'  {k} {X}: {len(E)} episodi; non finiti: {[e["date"] for e in E if not e["finished"]]}; vuoti nel VIX dentro: {sum(e["nullsInside"] for e in E)};'
                  f' finito(VIX validi) != finito(sedute indice): {[e["date"] for e in E if e["finished"] != e["finished_by_index_sessions"]]}')

if __name__ == '__main__':
    main(*sys.argv[1:6])

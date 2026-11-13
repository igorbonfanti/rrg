"""Ricalcolo indipendente delle statistiche dei testi della vista 8 («15 cali su 17», «mediana 110 sedute in 19 cali»).
Dati: chiusure dei 7 indici da data/indices.json e indices_more.json (formato di js/indexdata.js, decodificato in lib2.py);
cambi e DTWEXEMEGS dai CSV di FRED scaricati a parte (fonti/fred/), NON dalla cache del backtest né da data/emerging.json.
Definizioni (dai testi): calo = episodio con chiusura oltre il 25% sotto il massimo storico delle chiusure (dal massimo al nuovo
massimo; minimo = chiusura più bassa); F e D come in testa a js/emerging.js.
Uso: python3 -I h5_indip.py <sito>"""
import sys, os, csv, json, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib2
HERE = os.path.dirname(os.path.abspath(__file__))
lib2.init(sys.argv[1])
CCY = {'CSI300': 'DEXCHUS', 'NIFTY50': 'DEXINUS', 'IBOV': 'DEXBZUS', 'KOSPI200': 'DEXKOUS', 'TWN': 'DEXTAUS'}
KEYS = ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM']


def fred(id_, since):
    d, v = [], []
    for r in csv.reader(open(os.path.join(HERE, 'fonti/fred', id_ + '.csv'))):
        if r[0][:1] != '1' and r[0][:1] != '2': continue
        if r[0] >= since and r[1] not in ('', '.') and float(r[1]) > 0: d.append(r[0]); v.append(float(r[1]))
    return lib2.plain({'dates': d, 'val': v})


def episodes(c):
    eps, pk, lo, inep = [], None, None, False
    for t, x in enumerate(c):
        if x is None: continue
        if pk is None: pk = lo = t; continue
        if x >= c[pk]:
            if inep and c[lo] / c[pk] - 1 <= -0.25: eps.append((pk, lo, True))
            pk = lo = t; inep = False; continue
        inep = True
        if x < c[lo]: lo = t
    if inep and c[lo] / c[pk] - 1 <= -0.25: eps.append((pk, lo, False))
    return eps


def avail(d):  # martedì della settimana dopo (pubblicazione settimanale di H.10)
    x = dt.date.fromisoformat(d); dow = (x.weekday() + 1) % 7  # 0 domenica
    to_mon = ((8 - dow) % 7) or 7
    return (x + dt.timedelta(days=to_mon + 1)).isoformat()


def published(S, arr, dates):
    av = [avail(d) for d in S['dates']]; out = [None] * len(dates); j = -1
    for t, d in enumerate(dates):
        while j + 1 < len(av) and av[j + 1] <= d: j += 1
        if j >= 0 and lib2.dnum(d) - lib2.dnum(S['dates'][j]) <= 21: out[t] = arr[j]
    return out


DL = fred('DTWEXEMEGS', '2006-01-01'); DL.update(lib2.dollar_ind(DL))
FX = {}
for k, s in CCY.items():
    S = fred(s, '2000-01-01'); S.update(lib2.fx_ind(S)); FX[k] = S

rows = []
for k in KEYS:
    X = lib2.index(k); d, c = X['dates'], X['close']; n = len(d)
    F = None
    if k in CCY:
        m = dict(zip(FX[k]['dates'], FX[k]['F'])); F = [m.get(x) for x in d]
    Dsame = [dict(zip(DL['dates'], DL['D'])).get(x) for x in d]
    Dpub = published(DL, DL['D'], d)
    for pk, lo, rec in episodes(c):
        a, b = max(1, lo - 126), min(n - 1, lo + 126)
        r = {'k': k, 'massimo': d[pk], 'minimo': d[lo], 'dd': round((c[lo] / c[pk] - 1) * 100, 1), 'finito': rec}
        if F is not None:
            cov = any(F[t] is not None for t in range(a, b + 1))
            first = next((t - lo for t in range(a, b + 1) if F[t] == 1 and F[t - 1] != 1), None)
            # lettura letterale del testo: F acceso in almeno una seduta dei 126 prima del minimo
            on_before = any(F[t] == 1 for t in range(max(0, lo - 126), lo))
            # variante: prima accensione «vera» (0 -> 1, ignorando i buchi dei giorni di festa negli Stati Uniti)
            prev, first_strict = None, None
            for t in range(max(0, a - 300), b + 1):
                if F[t] is None: continue
                if t >= a and F[t] == 1 and prev == 0: first_strict = t - lo; break
                prev = F[t]
            r.update(Fcop=cov, Fprima=first, FaccesoPrima=on_before, FprimaStretta=first_strict, Fal_minimo=F[lo])
        for nm, D in (('pub', Dpub), ('stessogiorno', Dsame)):
            if D[lo] is None: r['D_' + nm] = 'assente al minimo'
            else: r['D_' + nm] = next((t - lo for t in range(lo, min(n - 1, lo + 252) + 1) if D[t] == 1), None)
        rows.append(r)


def med(v):
    v = sorted(v); n = len(v)
    return None if not n else (v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2)


fx_eps = [r for r in rows if 'Fcop' in r and r['Fcop']]
res = {
    'episodi': rows,
    'F_con_dati': len(fx_eps),
    'F_prima_backtest': sum(1 for r in fx_eps if isinstance(r['Fprima'], int) and r['Fprima'] < 0),
    'F_acceso_nei_126_prima': sum(1 for r in fx_eps if r['FaccesoPrima']),
    'F_prima_stretta': sum(1 for r in fx_eps if isinstance(r['FprimaStretta'], int) and r['FprimaStretta'] < 0),
}
for nm in ('pub', 'stessogiorno'):
    v = [r['D_' + nm] for r in rows if isinstance(r['D_' + nm], int)]
    res['D_' + nm] = {'con_dato': len(v), 'mediana': med(v), 'mai': sum(1 for r in rows if r['D_' + nm] is None), 'valori': sorted(v)}
json.dump(res, open(os.path.join(HERE, 'output/h5_indip.json'), 'w'), indent=1)
for r in rows: print(r)
print({k: v for k, v in res.items() if k != 'episodi'})

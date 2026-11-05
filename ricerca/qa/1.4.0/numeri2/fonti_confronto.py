"""Cambi di data/emerging.json contro FRED (scaricato a parte, fonti/fred/*.csv) fino al campo `fred`, e la coda di
Yahoo contro i cambi di riferimento BCE (fonti/ecb/eurofxref-hist.csv, incrociati con EUR/USD) e contro FRED.
Uso: python3 -I fonti_confronto.py <sito>"""
import sys, os, csv, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib2

site = sys.argv[1]; lib2.init(site)
HERE = os.path.dirname(os.path.abspath(__file__))
FRED = {'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS', 'HKD=X': 'DEXHKUS'}


def fred(id_):
    out = {}
    for r in csv.DictReader(open(os.path.join(HERE, 'fonti/fred', id_ + '.csv'))):
        k = [c for c in r if c != 'observation_date' and c != 'DATE'][0]
        d = r.get('observation_date') or r.get('DATE')
        if r[k] not in ('', '.'): out[d] = float(r[k])
    return out


ecb = {}
for r in csv.DictReader(open(os.path.join(HERE, 'fonti/ecb/eurofxref-hist.csv'))):
    ecb[r['Date']] = r
def ecb_usd(ccy, d):
    r = ecb.get(d)
    if not r or r.get(ccy) in (None, '', 'N/A') or r.get('USD') in (None, '', 'N/A'): return None
    return float(r[ccy]) / float(r['USD'])

res = {}
for sym, fid in FRED.items():
    s = lib2.em(sym); F = fred(fid)
    ps = lib2.EMG['series'][sym]['ps']; dec = 2 if ps == 100 else 4
    fr = s['fred']
    app = {d: v for d, v in zip(s['dates'], s['val']) if d <= fr}
    fdates = sorted(d for d in F if '2000-01-01' <= d <= fr)
    miss_in_app = [d for d in fdates if d not in app]
    extra_in_app = [d for d in app if d not in F]
    diff = [(d, app[d], F[d]) for d in fdates if d in app and abs(app[d] - round(F[d], dec)) > 0.5 * 10 ** -dec + 1e-12]
    tail = [(d, v) for d, v in zip(s['dates'], s['val']) if d > fr]
    cmp = []
    for d, v in tail:
        e0 = ecb_usd(sym[:3], d)
        # giorno prima per la BCE (Yahoo data t ~ sera di t-1 a Londra)
        prev = sorted(x for x in ecb if x < d)[-1]
        e1 = ecb_usd(sym[:3], prev)
        cmp.append({'date': d, 'yahoo': v, 'ecb_t': None if e0 is None else round(e0, 4), 'scarto_t_%': None if e0 is None else round(100 * math.log(v / e0), 3),
                    'ecb_prev': None if e1 is None else round(e1, 4), 'prev': prev, 'scarto_prev_%': None if e1 is None else round(100 * math.log(v / e1), 3)})
    # anche l'ultimo giorno Fed contro la BCE dello stesso giorno, come metro dello scarto normale
    lastF = [(d, F[d], ecb_usd(sym[:3], d)) for d in fdates[-10:]]
    res[sym] = {'fred_field': fr, 'fred_last_csv': max(F), 'righe_fed_app': len(app), 'righe_fred_csv_dal_2000': len(fdates),
                'mancano_nell_app': miss_in_app[:20], 'n_mancano': len(miss_in_app), 'in_piu_nell_app': extra_in_app[:20], 'n_in_piu': len(extra_in_app),
                'valori_diversi': diff[:20], 'n_diversi': len(diff), 'coda_yahoo': cmp,
                'fed_vs_bce_ultimi10_%': [(d, f, None if e is None else round(100 * math.log(f / e), 3)) for d, f, e in lastF],
                'primo': s['dates'][0]}

# DTWEXEMEGS
s = lib2.em('DTWEXEMEGS'); F = fred('DTWEXEMEGS')
app = dict(zip(s['dates'], s['val']))
fd = sorted(d for d in F if d >= '2006-01-01')
res['DTWEXEMEGS'] = {'righe_app': len(app), 'righe_fred': len(fd), 'ultimo_app': s['dates'][-1], 'ultimo_fred': fd[-1],
                     'diversi': [(d, app.get(d), F[d]) for d in fd if d not in app or abs(app[d] - round(F[d], 4)) > 5e-5][:20],
                     'in_piu': [d for d in app if d not in F][:20]}
json.dump(res, open(os.path.join(HERE, 'output/fonti_confronto.json'), 'w'), indent=1)
for k, v in res.items():
    if k == 'DTWEXEMEGS':
        print(k, v['righe_app'], v['righe_fred'], v['ultimo_app'], v['ultimo_fred'], 'diversi', len(v['diversi']), v['diversi'][:3], 'in più', v['in_piu'][:3]); continue
    print(f"{k}: fred={v['fred_field']} (csv {v['fred_last_csv']}), righe {v['righe_fed_app']}/{v['righe_fred_csv_dal_2000']}, mancano {v['n_mancano']} {v['mancano_nell_app'][:5]}, in più {v['n_in_piu']} {v['in_piu_nell_app'][:5]}, diversi {v['n_diversi']} {v['valori_diversi'][:3]}, primo {v['primo']}")
    for c in v['coda_yahoo']: print('   coda', c)
    print('   fed-bce ultimi', v['fed_vs_bce_ultimi10_%'][-5:])

# C1 bis. Serie sintetiche e raccordi: CPI (prices_macro.json) contro FRED CPIAUCSL, gradini dal giorno di uscita,
# DXY_INV = 10000/DX-Y.NYB, DBMFE.PA prima del 28/04/2025 = DBMF in euro raccordato, bitcoin all'ultima seduta.
# uso: python3 -I c1_macro.py
import sys, os, csv, io, time, bisect, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series, W


def fred(id_):
    p = W + 'fred/' + id_ + '.csv'
    if not os.path.exists(p):
        # FRED chiude la connessione a urllib con alcuni User-Agent: si scarica con curl
        import subprocess
        subprocess.run(['curl', '-sS', '-m', '60', '-o', p, f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={id_}&cosd=2000-01-01'], check=True); time.sleep(1)
    rows = list(csv.reader(io.StringIO(open(p).read())))
    return {r[0]: float(r[1]) for r in rows[1:] if r[1] not in ('', '.')}


M = load('prices_macro.json'); D = M['dates']
# 1. mesi del CPI
fr = {k[:7]: v for k, v in fred('CPIAUCSL').items()}
mm = M['cpi']['months']
bad = [(k, v, fr.get(k)) for k, v in mm.items() if fr.get(k) is None or abs(fr[k] - v) > 1e-6]
print('CPI: mesi nel file', len(mm), '| diversi da FRED:', bad)
print('     mesi FRED dal 2019 assenti nel file:', [k for k in fr if k >= '2019-01' and k not in mm], '| ultimo mese FRED', max(fr), fr[max(fr)])
# 2. gradini: alla data d vale l'ultimo mese uscito entro d
rel = M['cpi']['releases']; cpi = M['tickers']['CPI']['close']; errs = []
for i, d in enumerate(D):
    ms = [m for m in mm if rel.get(m) and rel[m] <= d]
    exp = mm[max(ms)] if ms else None
    if (cpi[i] is None) != (exp is None) or (exp is not None and abs(cpi[i] - exp) > 1e-6):
        errs.append((d, cpi[i], exp))
print('CPI a gradini: sedute', len(D), 'errori', len(errs), errs[:4])
print('     uscite degli ultimi mesi (file):', [(m, rel.get(m)) for m in sorted(mm)[-4:]])
# 3. DXY_INV
y = series('DX-Y.NYB', '5y'); yds = y['dates']; inv = M['tickers']['DXY_INV']['close']; e2 = []
for i, d in enumerate(D):
    j = bisect.bisect_right(yds, d) - 1
    exp = 10000 / y['close'][j]
    if inv[i] is None or abs(inv[i] / exp - 1) > 2e-5:
        e2.append((d, inv[i], round(exp, 4), yds[j]))
print('DXY_INV: sedute', len(D), 'errori', len(e2), e2[:5], '| ultima barra DX-Y.NYB', yds[-1])
# 4. DBMFE prima del raccordo
G = load('prices_global.json'); GD = G['dates']; app = G['tickers']['DBMFE.PA']['close']
live = series('DBMFE.PA', '5y'); prox = series('DBMF', '5y'); fx = series('EURUSD=X', '5y')
fxd = list(zip(fx['dates'], fx['close']))
fxdates = [a for a, _ in fxd]
rate = lambda d: fxd[bisect.bisect_right(fxdates, d) - 1][1] if bisect.bisect_right(fxdates, d) else None
pe = {d: a / rate(d) for d, a in zip(prox['dates'], prox['adj']) if rate(d)}
d0 = live['dates'][0]; pk = sorted(pe)
j = max(d for d in pe if d <= d0); k = live['adj'][0] / pe[j]
mx, n, worst = 0, 0, None
for i, d in enumerate(GD):
    if d >= d0 or app[i] is None:
        continue
    q = bisect.bisect_right(pk, d) - 1
    if q < 0:
        continue
    own = pe[pk[q]] * k; rel = abs(app[i] / own - 1); n += 1
    if rel > mx:
        mx, worst = rel, (d, app[i], round(own, 4))
print('DBMFE: prima barra', d0, 'fattore', round(k, 4), '| sedute prima del raccordo confrontate', n, 'max scarto relativo', f'{mx:.2e}', worst)
# 5. bitcoin all'ultima seduta
for f, s in (('prices_macro.json', 'BTC-USD'), ('prices_global.json', 'BTC-EUR')):
    P = load(f); b = series(s, '5y'); bd = dict(zip(b['dates'], b['close']))
    last = P['tickers'][s]['close'][-1]
    src = [d for d, v in bd.items() if abs(v - last) < 1e-3]
    print(f'{s}: valore del file al {P["asOf"]} = {last}, è la chiusura Yahoo del {src} | barra Yahoo del {P["asOf"]}: {bd.get(P["asOf"])}')

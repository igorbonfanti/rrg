import json, sys, csv
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import series
P = json.load(open('/home/user/rrg/data/prices_global.json')); D = P['dates']; app = P['tickers']['DBMFE.PA']['close']
live = series('DBMFE.PA'); prox = series('DBMF'); fx = series('EURUSD=X')
fxd = list(zip(fx['dates'], fx['close']))
def rate(d):
    r = None
    for x, v in fxd:
        if x <= d: r = v
        else: break
    return r
pe = {d: a / rate(d) for d, a in zip(prox['dates'], prox['adj']) if rate(d)}
d0 = live['dates'][0]
j = max(d for d in pe if d <= d0)
k = live['adj'][0] / pe[j]
print('DBMFE first bar', d0, live['adj'][0], 'proxy last<=d0', j, 'factor', k)
own = {}
for d in D:
    if d < d0:
        prev = [x for x in pe if x <= d and x < d0]
        if prev: own[d] = pe[max(prev)] * k
mx = 0; n = 0; worst = None
for i, d in enumerate(D):
    if d in own and app[i] is not None:
        rel = abs(app[i] / own[d] - 1); n += 1
        if rel > mx: mx, worst = rel, (d, app[i], own[d])
print('pre-splice points compared', n, 'max rel diff %', mx * 100, worst)
# splice-day return
i0 = D.index(d0); print('around splice', [(D[i], app[i]) for i in range(i0 - 2, i0 + 3)])
print('app day return at splice %', (app[i0] / app[i0 - 1] - 1) * 100, ' DBMF USD same day %', None)
pd_ = dict(zip(prox['dates'], prox['adj'])); print('DBMF USD', [(d, pd_.get(d)) for d in D[i0-2:i0+2]])
# FX cross-check Yahoo EURUSD=X vs FRED DEXUSEU
fr = {r['observation_date']: float(r['DEXUSEU']) for r in csv.DictReader(open('/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/fred/DEXUSEU.csv')) if r['DEXUSEU'] not in ('', '.')}
diffs = [abs(v / fr[d] - 1) * 100 for d, v in fxd if d in fr]
import statistics
print('EURUSD Yahoo vs FRED (noon NY): n', len(diffs), 'median abs %', statistics.median(diffs), 'p95', sorted(diffs)[int(.95 * len(diffs))], 'max', max(diffs))
# 52w/drawdown/YTD of DBMFE vs pure ETF
